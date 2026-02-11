import {
    HiOutlineChatBubbleLeftRight,
    HiOutlinePaperAirplane,
    HiOutlinePlusCircle,
    HiOutlineArrowRightOnRectangle,
    HiOutlineTrash,
    HiOutlineXMark,
    HiOutlineMoon,
    HiOutlineSun,
    HiOutlineExclamationTriangle,
    HiOutlineCheckCircle,
    HiOutlineInformationCircle,
    HiOutlineUser,
    HiOutlineCog6Tooth,
    HiOutlineEllipsisVertical,
    HiOutlineChevronRight,
    HiOutlineChevronLeft,
    HiOutlineEye,
    HiOutlineEyeSlash,
    HiOutlineBars3,
    HiOutlineSparkles,
} from "react-icons/hi2";
import type { IconProps } from "@/types";

const iconMap: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
    chat: HiOutlineChatBubbleLeftRight,
    send: HiOutlinePaperAirplane,
    plus: HiOutlinePlusCircle,
    logout: HiOutlineArrowRightOnRectangle,
    trash: HiOutlineTrash,
    close: HiOutlineXMark,
    moon: HiOutlineMoon,
    sun: HiOutlineSun,
    warning: HiOutlineExclamationTriangle,
    success: HiOutlineCheckCircle,
    info: HiOutlineInformationCircle,
    user: HiOutlineUser,
    settings: HiOutlineCog6Tooth,
    more: HiOutlineEllipsisVertical,
    "chevron-right": HiOutlineChevronRight,
    "chevron-left": HiOutlineChevronLeft,
    eye: HiOutlineEye,
    "eye-off": HiOutlineEyeSlash,
    menu: HiOutlineBars3,
    sparkles: HiOutlineSparkles,
};

export default function Icon({
    name,
    size = 20,
    className = "",
    color,
}: IconProps) {
    const IconComponent = iconMap[name];

    if (!IconComponent) {
        console.warn(`Icon "${name}" not found in icon map.`);
        return null;
    }

    return (
        <span
            className={`inline-flex items-center justify-center shrink-0 leading-none ${className}`}
            style={{ color, width: size, height: size }}
            aria-hidden="true"
        >
            <IconComponent size={size} />
        </span>
    );
}
