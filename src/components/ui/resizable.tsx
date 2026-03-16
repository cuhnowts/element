import { GripVertical } from "lucide-react";
import { Group, Panel, Separator } from "react-resizable-panels";

import { cn } from "@/lib/utils";

type GroupProps = React.ComponentProps<typeof Group>;

// Compatibility wrapper: maps shadcn-style `direction` to v4 `orientation`
// and `onLayout` to v4 `onLayoutChanged`
interface ResizablePanelGroupProps extends Omit<GroupProps, "orientation"> {
  direction?: "horizontal" | "vertical";
  onLayout?: (sizes: number[]) => void;
}

function ResizablePanelGroup({
  className,
  direction,
  onLayout,
  onLayoutChanged,
  ...props
}: ResizablePanelGroupProps & { onLayoutChanged?: GroupProps["onLayoutChanged"] }) {
  return (
    <Group
      orientation={direction}
      className={cn(
        "flex h-full w-full data-[panel-group-direction=vertical]:flex-col",
        className,
      )}
      onLayoutChanged={(layout) => {
        // Convert v4 Layout (Record<string, number>) to v3-style sizes array
        if (onLayout) {
          onLayout(Object.values(layout));
        }
        onLayoutChanged?.(layout);
      }}
      {...props}
    />
  );
}

function ResizablePanel({
  ...props
}: React.ComponentProps<typeof Panel>) {
  return <Panel {...props} />;
}

function ResizableHandle({
  withHandle,
  className,
  ...props
}: React.ComponentProps<typeof Separator> & {
  withHandle?: boolean;
}) {
  return (
    <Separator
      className={cn(
        "bg-border focus-visible:ring-ring relative flex w-px items-center justify-center after:absolute after:inset-y-0 after:left-1/2 after:w-1 after:-translate-x-1/2 focus-visible:ring-1 focus-visible:ring-offset-1 focus-visible:outline-hidden data-[panel-group-direction=vertical]:h-px data-[panel-group-direction=vertical]:w-full data-[panel-group-direction=vertical]:after:left-0 data-[panel-group-direction=vertical]:after:h-1 data-[panel-group-direction=vertical]:after:w-full data-[panel-group-direction=vertical]:after:-translate-y-1/2 data-[panel-group-direction=vertical]:after:translate-x-0 [&[data-panel-group-direction=vertical]>div]:rotate-90",
        className,
      )}
      {...props}
    >
      {withHandle && (
        <div className="bg-border z-10 flex h-4 w-3 items-center justify-center rounded-sm border">
          <GripVertical className="size-2.5" />
        </div>
      )}
    </Separator>
  );
}

export { ResizablePanelGroup, ResizablePanel, ResizableHandle };
