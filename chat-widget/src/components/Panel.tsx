import type { ComponentProps, ReactNode, RefObject } from "react";

import Composer from "./Composer";
import Launcher from "./Launcher";

export default function Panel({
  open,
  size,
  logRef,
  onScroll,
  onClickCapture,
  composer,
  onToggle,
  children,
}: {
  open: boolean;
  size: "s" | "m" | "l";
  logRef?: RefObject<HTMLDivElement>;
  onScroll?: () => void;
  onClickCapture?: (event: React.MouseEvent) => void;
  composer: ComponentProps<typeof Composer>;
  onToggle?: () => void;
  children: ReactNode;
}) {
  return (
    <>
      <div
        id="cc-panel"
        className="cc-panel"
        data-open={open}
        data-size={size}
        aria-hidden={!open}
      >
        <div
          className="cc-log"
          ref={logRef}
          onScroll={onScroll}
          onClickCapture={onClickCapture}
        >
          <div className="cc-log__content">{children}</div>
        </div>

        <Composer {...composer} />
      </div>

      <Launcher open={open} size={size} onClick={onToggle} />
    </>
  );
}
