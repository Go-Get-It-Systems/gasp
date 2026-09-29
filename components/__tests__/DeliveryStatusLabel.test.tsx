import { render } from "@testing-library/react-native";
import React from "react";

import { DeliveryStatusLabel } from "@/components/gasp/DeliveryStatusLabel";

describe("DeliveryStatusLabel", () => {
  it('renders "Sent" for status === "sent"', () => {
    const { getByText } = render(<DeliveryStatusLabel status="sent" />);
    expect(getByText("Sent")).toBeTruthy();
  });

  it('renders "Delivered" for status === "delivered"', () => {
    const { getByText } = render(<DeliveryStatusLabel status="delivered" />);
    expect(getByText("Delivered")).toBeTruthy();
  });

  it('renders "Opened" for status === "opened"', () => {
    const { getByText } = render(<DeliveryStatusLabel status="opened" />);
    expect(getByText("Opened")).toBeTruthy();
  });

  it('renders "Sent" as the default for status === undefined', () => {
    const { getByText } = render(<DeliveryStatusLabel status={undefined} />);
    expect(getByText("Sent")).toBeTruthy();
  });

  it('the "Opened" label applies the cyan color #06B6D4', () => {
    const { getByText } = render(<DeliveryStatusLabel status="opened" />);
    const label = getByText("Opened");
    const style = label.props.style;
    // style is an array from the Text component: [base, variantOverrides, additionalStyle]
    const flatStyle = Array.isArray(style)
      ? Object.assign({}, ...style)
      : style;
    expect(flatStyle.color).toBe("#06B6D4");
  });
});
