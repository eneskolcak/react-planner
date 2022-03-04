var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

import React from "react";
import PropTypes from "prop-types";

import { ReactSVGPanZoom, TOOL_NONE, TOOL_PAN, TOOL_ZOOM_IN, TOOL_ZOOM_OUT, TOOL_AUTO } from "react-svg-pan-zoom";
import * as constants from "../../constants";
import State from "./state";
import * as SharedStyle from "../../shared-style";
import { RulerX, RulerY } from "./export";
import { GiArrowCursor } from "react-icons/gi";
import { FaRegHandPointer } from "react-icons/fa";
import { FiZoomIn, FiZoomOut } from "react-icons/fi";
import { MdFullscreen } from "react-icons/md";
import { scale, transform, translate, fromObject } from "transformation-matrix";

function mode2Tool(mode) {
  switch (mode) {
    case constants.MODE_2D_PAN:
      return TOOL_PAN;
    case constants.MODE_2D_ZOOM_IN:
      return TOOL_ZOOM_IN;
    case constants.MODE_2D_ZOOM_OUT:
      return TOOL_ZOOM_OUT;
    case constants.MODE_IDLE:
      return TOOL_AUTO;
    default:
      return TOOL_NONE;
  }
}

function mode2PointerEvents(mode) {
  switch (mode) {
    case constants.MODE_DRAWING_LINE:
    case constants.MODE_DRAWING_HOLE:
    case constants.MODE_DRAWING_ITEM:
    case constants.MODE_DRAGGING_HOLE:
    case constants.MODE_DRAGGING_ITEM:
    case constants.MODE_DRAGGING_LINE:
    case constants.MODE_DRAGGING_VERTEX:
      return { pointerEvents: "none" };

    default:
      return {};
  }
}

function mode2Cursor(mode) {
  switch (mode) {
    case constants.MODE_DRAGGING_HOLE:
    case constants.MODE_DRAGGING_LINE:
    case constants.MODE_DRAGGING_VERTEX:
    case constants.MODE_DRAGGING_ITEM:
      return { cursor: "move" };

    case constants.MODE_ROTATING_ITEM:
      return { cursor: "ew-resize" };

    case constants.MODE_WAITING_DRAWING_LINE:
    case constants.MODE_DRAWING_LINE:
      return { cursor: "crosshair" };
    default:
      return { cursor: "default" };
  }
}

function mode2DetectAutopan(mode) {
  switch (mode) {
    case constants.MODE_DRAWING_LINE:
    case constants.MODE_DRAGGING_LINE:
    case constants.MODE_DRAGGING_VERTEX:
    case constants.MODE_DRAGGING_HOLE:
    case constants.MODE_DRAGGING_ITEM:
    case constants.MODE_DRAWING_HOLE:
    case constants.MODE_DRAWING_ITEM:
      return true;

    default:
      return false;
  }
}

function extractElementData(node) {
  while (!node.attributes.getNamedItem("data-element-root") && node.tagName !== "svg") {
    node = node.parentNode;
  }
  if (node.tagName === "svg") return null;

  return {
    part: node.attributes.getNamedItem("data-part") ? node.attributes.getNamedItem("data-part").value : undefined,
    layer: node.attributes.getNamedItem("data-layer").value,
    prototype: node.attributes.getNamedItem("data-prototype").value,
    selected: node.attributes.getNamedItem("data-selected").value === "true",
    id: node.attributes.getNamedItem("data-id").value
  };
}

export default function Viewer2D(_ref, _ref2) {
  var state = _ref.state,
      width = _ref.width,
      height = _ref.height,
      viewOnly = _ref.viewOnly;
  var viewer2DActions = _ref2.viewer2DActions,
      linesActions = _ref2.linesActions,
      holesActions = _ref2.holesActions,
      verticesActions = _ref2.verticesActions,
      itemsActions = _ref2.itemsActions,
      areaActions = _ref2.areaActions,
      projectActions = _ref2.projectActions,
      catalog = _ref2.catalog;
  var viewer2D = state.viewer2D,
      mode = state.mode,
      scene = state.scene;


  var layerID = scene.selectedLayer;

  var mapCursorPosition = function mapCursorPosition(_ref3) {
    var x = _ref3.x,
        y = _ref3.y;

    return { x: x, y: -y + scene.height };
  };

  var onMouseMove = function onMouseMove(viewerEvent) {
    //workaround that allow imageful component to work
    var evt = new Event("mousemove-planner-event");
    evt.viewerEvent = viewerEvent;
    document.dispatchEvent(evt);

    var _mapCursorPosition = mapCursorPosition(viewerEvent),
        x = _mapCursorPosition.x,
        y = _mapCursorPosition.y;

    projectActions.updateMouseCoord({ x: x, y: y });

    switch (mode) {
      case constants.MODE_DRAWING_LINE:
        linesActions.updateDrawingLine(x, y, state.snapMask);
        break;

      case constants.MODE_DRAWING_HOLE:
        holesActions.updateDrawingHole(layerID, x, y);
        break;

      case constants.MODE_DRAWING_ITEM:
        itemsActions.updateDrawingItem(layerID, x, y);
        break;

      case constants.MODE_DRAGGING_HOLE:
        holesActions.updateDraggingHole(x, y);
        break;

      case constants.MODE_DRAGGING_LINE:
        linesActions.updateDraggingLine(x, y, state.snapMask);
        break;

      case constants.MODE_DRAGGING_VERTEX:
        verticesActions.updateDraggingVertex(x, y, state.snapMask);
        break;

      case constants.MODE_DRAGGING_ITEM:
        itemsActions.updateDraggingItem(x, y);
        break;

      case constants.MODE_ROTATING_ITEM:
        itemsActions.updateRotatingItem(x, y);
        break;
    }

    viewerEvent.originalEvent.stopPropagation();
  };

  var onMouseDown = function onMouseDown(viewerEvent) {
    var event = viewerEvent.originalEvent;

    //workaround that allow imageful component to work
    var evt = new Event("mousedown-planner-event");
    evt.viewerEvent = viewerEvent;
    document.dispatchEvent(evt);

    var _mapCursorPosition2 = mapCursorPosition(viewerEvent),
        x = _mapCursorPosition2.x,
        y = _mapCursorPosition2.y;

    if (mode === constants.MODE_IDLE) {
      var elementData = extractElementData(event.target);
      if (!elementData || !elementData.selected) return;

      switch (elementData.prototype) {
        case "lines":
          linesActions.beginDraggingLine(elementData.layer, elementData.id, x, y, state.snapMask);
          break;

        case "vertices":
          verticesActions.beginDraggingVertex(elementData.layer, elementData.id, x, y, state.snapMask);
          break;

        case "items":
          if (elementData.part === "rotation-anchor") itemsActions.beginRotatingItem(elementData.layer, elementData.id, x, y);else itemsActions.beginDraggingItem(elementData.layer, elementData.id, x, y);
          break;

        case "holes":
          holesActions.beginDraggingHole(elementData.layer, elementData.id, x, y);
          break;

        default:
          break;
      }
    }
    event.stopPropagation();
  };

  var onMouseUp = function onMouseUp(viewerEvent) {
    var event = viewerEvent.originalEvent;

    var evt = new Event("mouseup-planner-event");
    evt.viewerEvent = viewerEvent;
    document.dispatchEvent(evt);

    var _mapCursorPosition3 = mapCursorPosition(viewerEvent),
        x = _mapCursorPosition3.x,
        y = _mapCursorPosition3.y;

    switch (mode) {
      case constants.MODE_IDLE:
        var elementData = extractElementData(event.target);

        if (elementData && elementData.selected) return;

        switch (elementData ? elementData.prototype : "none") {
          case "areas":
            areaActions.selectArea(elementData.layer, elementData.id);
            break;

          case "lines":
            linesActions.selectLine(elementData.layer, elementData.id);
            break;

          case "holes":
            holesActions.selectHole(elementData.layer, elementData.id);
            break;

          case "items":
            itemsActions.selectItem(elementData.layer, elementData.id);
            break;

          case "none":
            projectActions.unselectAll();
            break;
        }
        break;

      case constants.MODE_WAITING_DRAWING_LINE:
        linesActions.beginDrawingLine(layerID, x, y, state.snapMask);
        break;

      case constants.MODE_DRAWING_LINE:
        linesActions.endDrawingLine(x, y, state.snapMask);
        linesActions.beginDrawingLine(layerID, x, y, state.snapMask);
        break;

      case constants.MODE_DRAWING_HOLE:
        holesActions.endDrawingHole(layerID, x, y);
        break;

      case constants.MODE_DRAWING_ITEM:
        itemsActions.endDrawingItem(layerID, x, y);

        projectActions.rollback();

        break;

      case constants.MODE_DRAGGING_LINE:
        linesActions.endDraggingLine(x, y, state.snapMask);
        break;

      case constants.MODE_DRAGGING_VERTEX:
        verticesActions.endDraggingVertex(x, y, state.snapMask);
        break;

      case constants.MODE_DRAGGING_ITEM:
        itemsActions.endDraggingItem(x, y);
        break;

      case constants.MODE_DRAGGING_HOLE:
        holesActions.endDraggingHole(x, y);
        break;

      case constants.MODE_ROTATING_ITEM:
        itemsActions.endRotatingItem(x, y);
        break;
    }

    event.stopPropagation();
  };

  var onChangeValue = function onChangeValue(value) {
    projectActions.updateZoomScale(value.a);
    return viewer2DActions.updateCameraView(value);
  };

  var isZoomLevelGoingOutOfBounds = function isZoomLevelGoingOutOfBounds(value, scaleFactor) {
    var _decompose = decompose(value),
        curScaleFactor = _decompose.scaleFactor;

    var lessThanScaleFactorMin = value.scaleFactorMin && curScaleFactor * scaleFactor < value.scaleFactorMin;
    var moreThanScaleFactorMax = value.scaleFactorMax && curScaleFactor * scaleFactor > value.scaleFactorMax;

    return lessThanScaleFactorMin && scaleFactor < 1 || moreThanScaleFactorMax && scaleFactor > 1;
  };

  var onChangeTool = function onChangeTool(tool) {
    switch (tool) {
      case TOOL_NONE:
        projectActions.selectToolEdit();
        break;

      case TOOL_PAN:
        viewer2DActions.selectToolPan();
        break;

      case TOOL_ZOOM_IN:
        viewer2DActions.selectToolZoomIn();
        break;

      case TOOL_ZOOM_OUT:
        viewer2DActions.selectToolZoomOut();
        break;
    }
  };

  var limitZoomLevel = function limitZoomLevel(value, matrix) {
    var scaleLevel = matrix.a;

    if (value.scaleFactorMin != null) {
      // limit minimum zoom
      scaleLevel = Math.max(scaleLevel, value.scaleFactorMin);
    }

    if (value.scaleFactorMax != null) {
      // limit maximum zoom
      scaleLevel = Math.min(scaleLevel, value.scaleFactorMax);
    }

    return set(matrix, {
      a: scaleLevel,
      d: scaleLevel
    });
  };

  var set = function set(value, patch) {
    var action = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : null;

    value = Object.assign({}, value, patch, { lastAction: action });
    return Object.freeze(value);
  };

  var decompose = function decompose(value) {
    var matrix = fromObject(value);

    return {
      scaleFactor: matrix.a,
      translationX: matrix.e,
      translationY: matrix.f
    };
  };

  var fitToViewer = function fitToViewer(value) {
    var SVGAlignX = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : "ALIGN_COVER";
    var SVGAlignY = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : "ALIGN_COVER";
    var viewerWidth = value.viewerWidth,
        viewerHeight = value.viewerHeight,
        SVGMinX = value.SVGMinX,
        SVGMinY = value.SVGMinY,
        SVGWidth = value.SVGWidth,
        SVGHeight = value.SVGHeight;


    var scaleX = viewerWidth / SVGWidth;
    var scaleY = viewerHeight / SVGHeight;
    var scaleLevel = Math.min(scaleX, scaleY);

    var scaleMatrix = scale(scaleLevel, scaleLevel);

    var translateX = -SVGMinX * scaleX;
    var translateY = -SVGMinY * scaleY;

    // after fitting, SVG and the viewer will match in width (1) or in height (2) or SVG will cover the container with preserving aspect ratio (0)
    if (scaleX < scaleY) {
      var remainderY = viewerHeight - scaleX * SVGHeight;

      //(1) match in width, meaning scaled SVGHeight <= viewerHeight
      switch (SVGAlignY) {
        case "ALIGN_TOP":
          translateY = -SVGMinY * scaleLevel;
          break;

        case "ALIGN_CENTER":
          translateY = Math.round(remainderY / 2) - SVGMinY * scaleLevel;
          break;

        case "ALIGN_BOTTOM":
          translateY = remainderY - SVGMinY * scaleLevel;
          break;

        case "ALIGN_COVER":
          scaleMatrix = scale(scaleY, scaleY); // (0) we must now match to short edge, in this case - height
          var remainderX = viewerWidth - scaleY * SVGWidth; // calculate remainder in the other scale

          translateX = SVGMinX + Math.round(remainderX / 2); // center by the long edge
          break;

        default:
        //no op
      }
    } else {
      var _remainderX = viewerWidth - scaleY * SVGWidth;

      //(2) match in height, meaning scaled SVGWidth <= viewerWidth
      switch (SVGAlignX) {
        case "ALIGN_LEFT":
          translateX = -SVGMinX * scaleLevel;
          break;

        case "ALIGN_CENTER":
          translateX = Math.round(_remainderX / 2) - SVGMinX * scaleLevel;
          break;

        case "ALIGN_RIGHT":
          translateX = _remainderX - SVGMinX * scaleLevel;
          break;

        case "ALIGN_COVER":
          scaleMatrix = scale(scaleX, scaleX); // (0) we must now match to short edge, in this case - width
          var _remainderY = viewerHeight - scaleX * SVGHeight; // calculate remainder in the other scale

          translateY = SVGMinY + Math.round(_remainderY / 2); // center by the long edge
          break;

        default:
        //no op
      }
    }

    var translationMatrix = translate(translateX, translateY);

    var matrix = transform(translationMatrix, //2
    scaleMatrix //1
    );

    if (isZoomLevelGoingOutOfBounds(value, scaleLevel / value.d)) {
      // Do not allow scale and translation
      return set(value, {
        mode: "MODE_IDLE",
        startX: null,
        startY: null,
        endX: null,
        endY: null
      });
    }

    return set(value, _extends({
      mode: "MODE_IDLE"
    }, limitZoomLevel(value, matrix), {
      startX: null,
      startY: null,
      endX: null,
      endY: null
    }), "ACTION_ZOOM");
  };

  var _state$get$toJS = state.get("viewer2D").toJS(),
      e = _state$get$toJS.e,
      f = _state$get$toJS.f,
      SVGWidth = _state$get$toJS.SVGWidth,
      SVGHeight = _state$get$toJS.SVGHeight;

  var rulerSize = 0; //px
  var rulerUnitPixelSize = 100;
  var rulerBgColor = SharedStyle.PRIMARY_COLOR.main;
  var rulerFnColor = SharedStyle.COLORS.white;
  var rulerMkColor = SharedStyle.SECONDARY_COLOR.main;
  var sceneWidth = SVGWidth || state.getIn(["scene", "width"]);
  var sceneHeight = SVGHeight || state.getIn(["scene", "height"]);
  var sceneZoom = state.zoom || 1;
  var rulerXElements = Math.ceil(sceneWidth / rulerUnitPixelSize) + 1;
  var rulerYElements = Math.ceil(sceneHeight / rulerUnitPixelSize) + 1;

  var customToolBar = function customToolBar(props) {
    return React.createElement(
      "div",
      {
        style: {
          backgroundColor: "white",
          position: "absolute",
          display: "flex",
          border: "1px solid rgba(204, 204, 204, 1)",
          flexDirection: "column",
          justifyContent: "space-around",
          top: 15,
          padding: 15,
          color: "rgba(128, 128, 128, 1)",
          left: 20,
          borderRadius: 15
        }
      },
      !viewOnly && React.createElement(
        "label",
        {
          style: {
            width: "40px",
            height: "40px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            borderRadius: 5,
            backgroundColor: props.tool === "auto" ? "rgba(142, 67, 231, 1)" : "white",
            color: props.tool === "auto" ? "white" : "rgba(128, 128, 128, 1)"
          },
          onClick: function onClick() {
            return props.onChangeTool(TOOL_NONE);
          }
        },
        React.createElement(GiArrowCursor, null)
      ),
      React.createElement(
        "label",
        {
          style: {
            width: "40px",
            height: "40px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            borderRadius: 5,
            backgroundColor: props.tool === TOOL_PAN ? "rgba(142, 67, 231, 1)" : "white",
            color: props.tool === TOOL_PAN ? "white" : "rgba(128, 128, 128, 1)"
          },
          onClick: function onClick() {
            return props.onChangeTool(TOOL_PAN);
          }
        },
        React.createElement(FaRegHandPointer, null)
      ),
      React.createElement(
        "label",
        {
          style: {
            width: "40px",
            height: "40px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            borderRadius: 5,
            backgroundColor: props.tool === TOOL_ZOOM_IN ? "rgba(142, 67, 231, 1)" : "white",
            color: props.tool === TOOL_ZOOM_IN ? "white" : "rgba(128, 128, 128, 1)"
          },
          onClick: function onClick() {
            return props.onChangeTool(TOOL_ZOOM_IN);
          }
        },
        React.createElement(FiZoomIn, null)
      ),
      React.createElement(
        "label",
        {
          style: {
            width: "40px",
            height: "40px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            borderRadius: 5,
            backgroundColor: props.tool === TOOL_ZOOM_OUT ? "rgba(142, 67, 231, 1)" : "white",
            color: props.tool === TOOL_ZOOM_OUT ? "white" : "rgba(128, 128, 128, 1)"
          },
          onClick: function onClick() {
            return props.onChangeTool(TOOL_ZOOM_OUT);
          }
        },
        React.createElement(FiZoomOut, null)
      ),
      React.createElement(
        "label",
        {
          style: {
            width: "40px",
            height: "40px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer"
          },
          onClick: function onClick() {
            var newValue = fitToViewer(props.value);

            props.onChangeValue(_extends({}, newValue, { e: 0, f: 0 }));
          }
        },
        React.createElement(MdFullscreen, null)
      )
    );
  };

  return React.createElement(
    "div",
    {
      style: {
        margin: 0,
        padding: 0,
        display: "grid",
        gridRowGap: "0",
        gridColumnGap: "0",
        gridTemplateColumns: rulerSize + "px " + (width - rulerSize) + "px",
        gridTemplateRows: rulerSize + "px " + (height - rulerSize) + "px",
        position: "relative"
      }
    },
    React.createElement("div", {
      style: { gridColumn: 1, gridRow: 1, backgroundColor: rulerBgColor }
    }),
    React.createElement(
      "div",
      {
        style: {
          gridRow: 1,
          gridColumn: 2,
          position: "relative",
          overflow: "hidden"
        },
        id: "rulerX"
      },
      sceneWidth ? React.createElement(RulerX, {
        unitPixelSize: rulerUnitPixelSize,
        zoom: sceneZoom,
        mouseX: state.mouse.get("x"),
        width: width - rulerSize,
        zeroLeftPosition: e || 0,
        backgroundColor: rulerBgColor,
        fontColor: rulerFnColor,
        markerColor: rulerMkColor,
        positiveUnitsNumber: rulerXElements,
        negativeUnitsNumber: 0
      }) : null
    ),
    React.createElement(
      "div",
      {
        style: {
          gridColumn: 1,
          gridRow: 2,
          position: "relative",
          overflow: "hidden"
        },
        id: "rulerY"
      },
      sceneHeight ? React.createElement(RulerY, {
        unitPixelSize: rulerUnitPixelSize,
        zoom: sceneZoom,
        mouseY: state.mouse.get("y"),
        height: height - rulerSize,
        zeroTopPosition: sceneHeight * sceneZoom + f || 0,
        backgroundColor: rulerBgColor,
        fontColor: rulerFnColor,
        markerColor: rulerMkColor,
        positiveUnitsNumber: rulerYElements,
        negativeUnitsNumber: 0
      }) : null
    ),
    React.createElement(
      ReactSVGPanZoom,
      {
        width: width,
        height: height,
        value: viewer2D.isEmpty() ? null : viewer2D.toJS(),
        onChangeValue: function onChangeValue(value) {
          console.log("FIT TO VIEWER");
          console.log(value);
          // onChangeValue(value);
        },
        tool: mode2Tool(mode),
        onChangeTool: onChangeTool,
        detectAutoPan: mode2DetectAutopan(mode),
        onMouseDown: onMouseDown,
        onMouseMove: onMouseMove,
        customToolbar: customToolBar,
        onMouseUp: onMouseUp,
        miniaturePosition: "none",
        toolbarPosition: "top"
      },
      React.createElement(
        "svg",
        { width: scene.width, height: scene.height },
        React.createElement(
          "defs",
          null,
          React.createElement(
            "pattern",
            {
              id: "diagonalFill",
              patternUnits: "userSpaceOnUse",
              width: "4",
              height: "4",
              fill: "#FFF"
            },
            React.createElement("rect", { x: "0", y: "0", width: "4", height: "4", fill: "#FFF" }),
            React.createElement("path", {
              d: "M-1,1 l2,-2 M0,4 l4,-4 M3,5 l2,-2",
              style: { stroke: "#8E9BA2", strokeWidth: 1 }
            })
          )
        ),
        React.createElement(
          "g",
          { style: Object.assign(mode2Cursor(mode), mode2PointerEvents(mode)) },
          React.createElement(State, { state: state, catalog: catalog })
        )
      )
    )
  );
}

Viewer2D.propTypes = {
  state: PropTypes.object.isRequired,
  width: PropTypes.number.isRequired,
  height: PropTypes.number.isRequired
};

Viewer2D.contextTypes = {
  viewer2DActions: PropTypes.object.isRequired,
  linesActions: PropTypes.object.isRequired,
  holesActions: PropTypes.object.isRequired,
  verticesActions: PropTypes.object.isRequired,
  itemsActions: PropTypes.object.isRequired,
  areaActions: PropTypes.object.isRequired,
  projectActions: PropTypes.object.isRequired,
  catalog: PropTypes.object.isRequired
};