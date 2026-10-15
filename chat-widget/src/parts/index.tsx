import type { ChatTools, DisplayTool } from "../../../shared/tools";
import FaqCard from "./FaqCard";
import ProductCards from "./ProductCards";

export const PARTS: {
  [K in DisplayTool]: (props: {
    output: ChatTools[K]["output"];
  }) => JSX.Element;
} = {
  showProducts: ({ output }) => <ProductCards {...output} />,
  showFaqCard: ({ output }) => <FaqCard {...output} />,
};
