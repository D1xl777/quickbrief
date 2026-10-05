import { Alert } from "@/components/ui/alert";

export function DemoRulesNotice() {
  return (
    <Alert tone="warning" title="DEMO POLICY RULES">
      Policies marked as demo exist only to demonstrate product functionality. They do not describe
      current gambling law or any regulator&apos;s requirements. Real rules must be entered and
      reviewed by qualified compliance staff.
    </Alert>
  );
}
