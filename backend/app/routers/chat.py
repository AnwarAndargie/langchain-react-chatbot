from fastapi import APIRouter

router = APIRouter()


@router.post("/message")
async def send_message():
    """Send a chat message"""
    pass


@router.get("/history")
async def get_chat_history():
    """Get chat history"""
    pass
