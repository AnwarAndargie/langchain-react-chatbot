"""
LangChain agent service: ReAct-style agent with Gemini and tools.

Wires ChatGoogleGenerativeAI with Tavily search and Google Trends MCP,
enforces iteration limits and timeouts, and supports chat history.
"""

from __future__ import annotations

import logging
from typing import Any, List, Optional, Sequence

from app.core import settings
from app.services.tools.tavily import (
    LANGCHAIN_TOOL_DESCRIPTION as TAVILY_DESCRIPTION,
    LANGCHAIN_TOOL_NAME as TAVILY_TOOL_NAME,
    is_tavily_available,
    search_tavily,
)
from app.services.tools.google_trends_mcp import (
    LANGCHAIN_TOOL_DESCRIPTION as MCP_DESCRIPTION,
    LANGCHAIN_TOOL_NAME as MCP_TOOL_NAME,
    get_google_trends,
    is_mcp_available,
)

logger = logging.getLogger(__name__)

# -----------------------------------------------------------------------------
# Tool wrappers (return strings for agent observation)
# -----------------------------------------------------------------------------


def _format_tavily_result(payload: dict[str, Any]) -> str:
    """Turn Tavily search result into a short string for the agent."""
    if payload.get("error"):
        return f"Search error: {payload['error']}"
    results = payload.get("results") or []
    answer = payload.get("answer")
    if answer:
        return f"Answer: {answer}\n\nSources:\n" + "\n".join(
            f"- {r.get('title', '')} ({r.get('url', '')}): {str(r.get('content', ''))[:200]}..."
            for r in results[:5]
        )
    if not results:
        return "No search results found."
    return "\n".join(
        f"- {r.get('title', '')} | {r.get('url', '')}\n  {str(r.get('content', ''))[:300]}"
        for r in results[:5]
    )


def _format_trends_result(payload: dict[str, Any]) -> str:
    """Turn Google Trends result into a short string for the agent."""
    if payload.get("error"):
        return f"Trends error: {payload['error']}"
    trends = payload.get("trends") or []
    if not trends:
        return "No trending terms returned."
    lines = []
    for t in trends[:15]:
        if isinstance(t, dict):
            kw = t.get("keyword", t.get("name", ""))
            vol = t.get("volume", "")
            lines.append(f"- {kw}" + (f" (volume: {vol})" if vol else ""))
        else:
            lines.append(f"- {t}")
    return "\n".join(lines)


def _tavily_invoke(query: str) -> str:
    """LangChain-callable Tavily search; input is the search query string."""
    if not (query or "").strip():
        return "Error: search query cannot be empty."
    out = search_tavily(query.strip(), max_results=settings.tavily_max_results)
    return _format_tavily_result(out)


def _google_trends_invoke(geo_or_query: str) -> str:
    """LangChain-callable Google Trends; input is country code or short description (e.g. 'US', 'trends in UK')."""
    raw = (geo_or_query or "US").strip()
    # Extract country code if user wrote something like "trends in UK" or "what's trending in India"
    geo = "US"
    for part in raw.upper().replace(",", " ").split():
        if len(part) == 2 and part.isalpha():
            geo = part
            break
    if raw.upper() in ("US", "UK", "GB", "IN", "DE", "FR", "JP", "BR", "CA", "AU"):
        geo = "GB" if raw.upper() in ("UK", "GB") else raw.upper()
    out = get_google_trends(geo=geo, full_data=False)
    return _format_trends_result(out)


# -----------------------------------------------------------------------------
# LangChain tools and LLM
# -----------------------------------------------------------------------------


def _build_tools() -> List[Any]:
    """Build list of LangChain tools (only include if backend is configured)."""
    from langchain_core.tools import StructuredTool

    tools: List[Any] = []
    if is_tavily_available():
        tools.append(
            StructuredTool.from_function(
                name=TAVILY_TOOL_NAME,
                description=TAVILY_DESCRIPTION,
                func=_tavily_invoke,
            )
        )
    if is_mcp_available():
        tools.append(
            StructuredTool.from_function(
                name=MCP_TOOL_NAME,
                description=MCP_DESCRIPTION,
                func=_google_trends_invoke,
            )
        )
    return tools


def _get_llm(streaming: bool = False):
    """Return ChatGoogleGenerativeAI instance from settings. Use streaming=True for token-level stream."""
    from langchain_google_genai import ChatGoogleGenerativeAI

    return ChatGoogleGenerativeAI(
        model=settings.gemini_model,
        google_api_key=settings.gemini_api_key or "dummy",
        temperature=0.2,
        max_output_tokens=2048,
        streaming=streaming,
    )


def _create_agent(streaming: bool = False):
    """Build the agent (tool-calling) and executor."""
    from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder

    llm = _get_llm(streaming=streaming)
    tools = _build_tools()

    if not tools:
        if streaming:
            return _create_fallback_chain_streaming()
        return _create_fallback_chain()

    try:
        from langchain.agents import AgentExecutor, create_tool_calling_agent
    except ImportError:
        try:
            from langchain.agents.tool_calling_agent.base import create_tool_calling_agent
            from langchain.agents import AgentExecutor
        except ImportError:
            logger.warning("Tool-calling agent not available; using fallback chain")
            if streaming:
                return _create_fallback_chain_streaming()
            return _create_fallback_chain()

    prompt = ChatPromptTemplate.from_messages([
        ("system", (
            "You are a helpful assistant with access to tools. Use them when they would help answer the user. "
            "When you use a tool, summarize the result clearly for the user. If a tool fails, say so and answer from your knowledge if possible."
        )),
        MessagesPlaceholder(variable_name="chat_history", optional=True),
        ("human", "{input}"),
        MessagesPlaceholder(variable_name="agent_scratchpad"),
    ])

    agent = create_tool_calling_agent(llm, tools, prompt)
    executor = AgentExecutor(
        agent=agent,
        tools=tools,
        max_iterations=settings.agent_max_iterations,
        max_execution_time=float(settings.agent_timeout_seconds),
        handle_parsing_errors=True,
        return_intermediate_steps=False,
        verbose=settings.debug,
    )
    return executor


def _create_fallback_chain():
    """Fallback when no tools are available: LLM chain with conversation history."""
    from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder

    llm = _get_llm()
    prompt = ChatPromptTemplate.from_messages([
        ("system", "You are a helpful assistant. Answer the user concisely. Use the conversation history for context when the user refers to earlier messages."),
        MessagesPlaceholder(variable_name="chat_history", optional=True),
        ("human", "{input}"),
    ])
    return prompt | llm | (lambda m: m.content if hasattr(m, "content") else str(m))


def _create_fallback_chain_streaming():
    """Same as fallback but with streaming LLM so we can stream tokens via .stream()."""
    from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder

    llm = _get_llm(streaming=True)
    prompt = ChatPromptTemplate.from_messages([
        ("system", "You are a helpful assistant. Answer the user concisely. Use the conversation history for context when the user refers to earlier messages."),
        MessagesPlaceholder(variable_name="chat_history", optional=True),
        ("human", "{input}"),
    ])
    return prompt | llm


# Lazy singleton executors (created on first use)
_agent_executor: Any = None
_streaming_agent_executor: Any = None


def get_agent():
    """Return the shared agent executor (or fallback chain). Creates it on first call."""
    global _agent_executor
    if _agent_executor is None:
        _agent_executor = _create_agent(streaming=False)
    return _agent_executor


def get_streaming_agent():
    """Return the shared streaming agent executor. Creates it on first call."""
    global _streaming_agent_executor
    if _streaming_agent_executor is None:
        _streaming_agent_executor = _create_agent(streaming=True)
    return _streaming_agent_executor


# -----------------------------------------------------------------------------
# Public API: invoke with optional history
# -----------------------------------------------------------------------------


def _messages_to_langchain(history: Sequence[dict[str, str]]) -> List[Any]:
    """Convert [{"role":"user"|"assistant","content":"..."}] to LangChain message objects."""
    from langchain_core.messages import AIMessage, HumanMessage

    out: List[Any] = []
    for h in history:
        role = (h.get("role") or "").strip().lower()
        content = (h.get("content") or "").strip()
        if not content:
            continue
        if role == "user":
            out.append(HumanMessage(content=content))
        elif role == "assistant":
            out.append(AIMessage(content=content))
    return out


def invoke_agent(
    user_message: str,
    chat_history: Optional[Sequence[dict[str, str]]] = None,
) -> str:
    """
    Run the agent on a user message and return the final answer string.

    Args:
        user_message: The user's input text.
        chat_history: Optional list of {"role": "user"|"assistant", "content": "..."} for context.

    Returns:
        The agent's reply as a string. On failure, returns a safe fallback message.
    """
    if not (user_message or "").strip():
        return "Please provide a message."

    agent = get_agent()
    history = list(chat_history) if chat_history else []

    try:
        # AgentExecutor.invoke expects input dict; some agents use "input", some "message"
        if hasattr(agent, "invoke"):
            inp: dict[str, Any] = {"input": user_message.strip()}
            if history:
                inp["chat_history"] = _messages_to_langchain(history)
            result = agent.invoke(inp)
            # Fallback chain returns a message or list; AgentExecutor returns a dict
            if isinstance(result, dict):
                output = result.get("output") or result.get("response") or result.get("output_response")
                if output is not None:
                    if hasattr(output, "content"):
                        return str(output.content or "").strip()
                    return str(output).strip()
                if result.get("messages"):
                    last = result["messages"][-1]
                    if hasattr(last, "content") and last.content:
                        return str(last.content).strip()
                return str(result).strip()
            # Fallback chain: result may be AIMessage or list of messages
            if isinstance(result, list) and result:
                result = result[-1]
            if hasattr(result, "content"):
                return str(result.content or "").strip()
            return str(result).strip()
        else:
            out = agent.invoke({"input": user_message.strip()})
            return (out.content if hasattr(out, "content") else str(out)).strip()
    except Exception as e:
        err_msg = str(e)
        logger.exception("Agent invocation failed: %s", err_msg)
        msg = err_msg.lower()
        if "timeout" in msg or "deadline" in msg:
            return "The request took too long. Please try a shorter question or try again later."
        if "rate" in msg or "quota" in msg or "429" in msg:
            logger.warning("Agent rate/quota error (check Gemini, Tavily, or MCP): %s", err_msg)
            return "Service is temporarily busy. Please try again in a moment."
        return "Something went wrong while answering. Please try again."


async def invoke_agent_async(
    user_message: str,
    chat_history: Optional[Sequence[dict[str, str]]] = None,
) -> str:
    """Async wrapper for invoke_agent (runs in thread pool to avoid blocking)."""
    import asyncio
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(
        None,
        lambda: invoke_agent(user_message, chat_history),
    )


def _extract_text(content: Any) -> str:
    """
    Extract plain text from a LangChain chunk's content field.

    Gemini returns content as a list of part dicts, e.g.:
        [{'type': 'text', 'text': 'Hello', 'index': 0}]
    Other models return a plain string. This normalises both to a string.
    """
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        parts: list[str] = []
        for part in content:
            if isinstance(part, dict):
                text = part.get("text", "")
                if text:
                    parts.append(str(text))
            elif isinstance(part, str):
                parts.append(part)
        return "".join(parts)
    return str(content) if content else ""


async def stream_agent_async(
    user_message: str,
    chat_history: Optional[Sequence[dict[str, str]]] = None,
):
    """
    Stream the agent reply token-by-token.

    Uses astream_events(version="v2") for AgentExecutor to capture
    on_chat_model_stream events (the final answer tokens) in real time.
    Falls back to the streaming chain for non-executor agents.
    """
    agent = get_streaming_agent()
    history = list(chat_history) if chat_history else []
    inp: dict[str, Any] = {"input": (user_message or "").strip()}
    if history:
        inp["chat_history"] = _messages_to_langchain(history)

    # Check if we have the fallback chain (no AgentExecutor)
    try:
        from langchain.agents import AgentExecutor
        is_executor = isinstance(agent, AgentExecutor)
    except ImportError:
        is_executor = False

    if is_executor:
        # Use astream_events to get real token-level streaming from the AgentExecutor.
        # We listen for "on_chat_model_stream" events which fire for each LLM token.
        # We only emit tokens from the *final* answer (not from tool-calling steps).
        try:
            async for event in agent.astream_events(inp, version="v2"):
                kind = event.get("event", "")
                
                # Tool start event -> yield tool activity
                if kind == "on_tool_start":
                    tool_name = event.get("name", "")
                    # Filter out internal/wrapper tools if needed, but usually we want to see them
                    if tool_name:
                         yield {"type": "tool_start", "tool": tool_name}

                # on_chat_model_stream fires for each token generated by the LLM
                elif kind == "on_chat_model_stream":
                    data = event.get("data", {})
                    chunk = data.get("chunk")
                    if chunk is not None:
                        # Skip chunks that are tool calls (not user-facing text)
                        if hasattr(chunk, "tool_call_chunks") and chunk.tool_call_chunks:
                            continue
                        token = ""
                        if hasattr(chunk, "content"):
                            token = _extract_text(chunk.content)
                        elif isinstance(chunk, str):
                            token = chunk
                        if token:
                            yield {"type": "token", "content": token}
        except Exception as e:
            logger.exception("Agent stream (astream_events) failed: %s", e)
            err_msg = str(e).lower()
            if "rate" in err_msg or "quota" in err_msg or "429" in err_msg:
                yield {"type": "token", "content": "Service is temporarily busy. Please try again in a moment."}
            else:
                yield {"type": "token", "content": "Something went wrong while answering. Please try again."}
        return

    # Fallback chain: use astream for direct token streaming
    try:
        async for chunk in agent.astream(inp):
            if hasattr(chunk, "content"):
                token = _extract_text(chunk.content)
                if token:
                    yield {"type": "token", "content": token}
            elif isinstance(chunk, str) and chunk:
                yield {"type": "token", "content": chunk}
    except Exception as e:
        logger.exception("Agent stream failed: %s", e)
        msg = str(e).lower()
        if "rate" in msg or "quota" in msg or "429" in msg:
            yield {"type": "token", "content": "Service is temporarily busy. Please try again in a moment."}
        else:
            yield {"type": "token", "content": "Something went wrong while answering. Please try again."}
