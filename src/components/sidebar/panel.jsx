import React, { Component } from "react";
import PropTypes from "prop-types";
import * as SharedStyle from "../../shared-style";
import { FaAngleDown, FaAngleUp } from "react-icons/fa";

const STYLE = {};
const STYLE_TITLE = {
  fontSize: "11px",
  color: "black",
  padding: "5px 15px 8px 15px",
  backgroundColor: "rgba(246, 246, 246)",
  borderTopLeftRadius: "15px",
  borderTopRightRadius: "15px",
  margin: "0px",
};
const STYLE_CONTENT = {
  fontSize: "11px",
  color: "black",
  borderBottomLeftRadius: "15px",
  borderBottomRightRadius: "15px",
  padding: "0px",
  backgroundColor: "rgba(246, 246, 246)",
};
const STYLE_ARROW = {
  float: "right",
};

export default class Panel extends Component {
  constructor(props, context) {
    super(props, context);

    this.state = {
      opened: props.hasOwnProperty("opened") ? props.opened : false,
      hover: false,
    };
  }

  toggleOpen() {
    this.setState({ opened: !this.state.opened });
  }

  toggleHover() {
    this.setState({ hover: !this.state.hover });
  }

  render() {
    let { name, headComponents, children } = this.props;
    let { opened, hover } = this.state;

    return (
      <div style={STYLE}>
        <h3 style={STYLE_TITLE}>
          {name}
          {headComponents}
        </h3>
        <div style={STYLE_CONTENT}>{children}</div>
      </div>
    );

    return (
      <div style={STYLE}>
        <h3
          style={{
            ...STYLE_TITLE,
            color: hover
              ? SharedStyle.SECONDARY_COLOR.main
              : SharedStyle.PRIMARY_COLOR.text_alt,
          }}
          onMouseEnter={() => this.toggleHover()}
          onMouseLeave={() => this.toggleHover()}
          onClick={() => this.toggleOpen()}
        >
          {name}
          {headComponents}
          {opened ? (
            <FaAngleUp style={STYLE_ARROW} />
          ) : (
            <FaAngleDown style={STYLE_ARROW} />
          )}
        </h3>

        <div style={{ ...STYLE_CONTENT, display: opened ? "block" : "none" }}>
          {children}
        </div>
      </div>
    );
  }
}

Panel.propTypes = {
  name: PropTypes.string.isRequired,
  headComponents: PropTypes.array,
  opened: PropTypes.bool,
};
