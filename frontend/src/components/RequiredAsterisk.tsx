import React from "react";

export const RequiredAsterisk: React.FC<{ style?: React.CSSProperties }> = ({ style }) => (
  <span className="required-marker" style={style}>
    *
  </span>
);

export default RequiredAsterisk;
