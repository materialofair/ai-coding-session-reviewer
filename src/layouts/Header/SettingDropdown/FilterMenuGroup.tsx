import {
  DropdownMenuLabel,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import { useTranslation } from "react-i18next";
import { Eye, Wrench } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";

export const FilterMenuGroup = () => {
  const { t } = useTranslation();
  const {
    showSystemMessages,
    setShowSystemMessages,
    showToolCalls,
    setShowToolCalls,
  } = useAppStore();

  return (
    <>
      <DropdownMenuLabel>{t('common.settings.filter.title', { defaultValue: "필터" })}</DropdownMenuLabel>
      <DropdownMenuCheckboxItem
        checked={showSystemMessages}
        onCheckedChange={setShowSystemMessages}
      >
        <Eye className="mr-2 h-4 w-4 text-foreground" />
        <span>{t('common.settings.filter.showSystemMessages', { defaultValue: "시스템 메시지 표시" })}</span>
      </DropdownMenuCheckboxItem>
      <DropdownMenuCheckboxItem
        checked={showToolCalls}
        onCheckedChange={setShowToolCalls}
      >
        <Wrench className="mr-2 h-4 w-4 text-foreground" />
        <span>{t("common.settings.filter.showToolCalls", { defaultValue: "显示工具调用与思考" })}</span>
      </DropdownMenuCheckboxItem>
    </>
  );
};
