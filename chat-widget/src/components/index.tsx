import TextMessage from "./TextMessage";
import type { ChatComponent } from "./types";

export function renderComponent(component: ChatComponent) {
  switch (component.type) {
    case "textMessage":
      return <TextMessage {...component.props} />;
  }
}
