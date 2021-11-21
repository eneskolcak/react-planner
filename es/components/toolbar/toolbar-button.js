var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

import React, { Component } from "react";
import PropTypes from "prop-types";
import * as SharedStyle from "../../shared-style";

//http://www.cssportal.com/css-tooltip-generator/

var STYLE = {
  width: "30px",
  height: "30px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  marginBottom: "5px",
  fontSize: "25px",
  position: "relative",
  cursor: "pointer"
};

var STYLE_TOOLTIP = {
  position: "absolute",
  width: "140px",
  color: SharedStyle.COLORS.white,
  background: SharedStyle.COLORS.black,
  height: "30px",
  lineHeight: "30px",
  textAlign: "center",
  visibility: "visible",
  borderRadius: "6px",
  opacity: "0.8",
  left: "100%",
  top: "50%",
  marginTop: "-15px",
  marginLeft: "15px",
  zIndex: "999",
  fontSize: "12px"
};

var STYLE_TOOLTIP_PIN = {
  position: "absolute",
  top: "50%",
  right: "100%",
  marginTop: "-8px",
  width: "0",
  height: "0",
  borderRight: "8px solid #000000",
  borderTop: "8px solid transparent",
  borderBottom: "8px solid transparent"
};

var ToolbarButton = function (_Component) {
  _inherits(ToolbarButton, _Component);

  function ToolbarButton(props, context) {
    _classCallCheck(this, ToolbarButton);

    var _this = _possibleConstructorReturn(this, (ToolbarButton.__proto__ || Object.getPrototypeOf(ToolbarButton)).call(this, props, context));

    _this.state = { active: false };
    return _this;
  }

  _createClass(ToolbarButton, [{
    key: "render",
    value: function render() {
      var _this2 = this;

      var state = this.state,
          props = this.props;
      var name = props.name;

      var color = props.active || state.active ? SharedStyle.SECONDARY_COLOR.icon : SharedStyle.PRIMARY_COLOR.icon;

      if (name) return React.createElement(
        "div",
        {
          onClick: props.onClick,
          onMouseOver: function onMouseOver(event) {
            return _this2.setState({ active: true });
          },
          onMouseOut: function onMouseOut(event) {
            return _this2.setState({ active: false });
          },
          style: {
            display: "flex",
            alignItems: "center",
            justifyContent: "between",
            flexDirection: "row",
            paddingLeft: "10px",
            paddingRight: "10px",
            marginBottom: "10px",
            paddingTop: "10px",
            paddingBottom: "10px",
            borderRadius: 15,
            cursor: "pointer",
            backgroundColor: "white"
          }
        },
        React.createElement(
          "i",
          {
            style: {
              backgroundColor: "black",
              width: "40px",
              height: "40px",
              borderRadius: "100%",
              color: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginRight: "10px"
            }
          },
          props.children
        ),
        React.createElement(
          "p",
          {
            className: "text-base font-bold",
            style: {
              fontWeight: 500
            }
          },
          name
        )
      );else return React.createElement("div", null);
    }
  }]);

  return ToolbarButton;
}(Component);

export default ToolbarButton;


ToolbarButton.propTypes = {
  active: PropTypes.bool.isRequired,
  tooltip: PropTypes.string.isRequired,
  onClick: PropTypes.func.isRequired
};