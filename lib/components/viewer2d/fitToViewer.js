"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.fitToViewer = undefined;

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _transformationMatrix = require("transformation-matrix");

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
  var matrix = (0, _transformationMatrix.fromObject)(value);

  return {
    scaleFactor: matrix.a,
    translationX: matrix.e,
    translationY: matrix.f
  };
};

var fitToViewer = exports.fitToViewer = function fitToViewer(value) {
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

  var scaleMatrix = (0, _transformationMatrix.scale)(scaleLevel, scaleLevel);

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
        scaleMatrix = (0, _transformationMatrix.scale)(scaleY, scaleY); // (0) we must now match to short edge, in this case - height
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
        scaleMatrix = (0, _transformationMatrix.scale)(scaleX, scaleX); // (0) we must now match to short edge, in this case - width
        var _remainderY = viewerHeight - scaleX * SVGHeight; // calculate remainder in the other scale

        translateY = SVGMinY + Math.round(_remainderY / 2); // center by the long edge
        break;

      default:
      //no op
    }
  }

  var isZoomLevelGoingOutOfBounds = function isZoomLevelGoingOutOfBounds(value, scaleFactor) {
    var _decompose = decompose(value),
        curScaleFactor = _decompose.scaleFactor;

    var lessThanScaleFactorMin = value.scaleFactorMin && curScaleFactor * scaleFactor < value.scaleFactorMin;
    var moreThanScaleFactorMax = value.scaleFactorMax && curScaleFactor * scaleFactor > value.scaleFactorMax;

    return lessThanScaleFactorMin && scaleFactor < 1 || moreThanScaleFactorMax && scaleFactor > 1;
  };

  var translationMatrix = (0, _transformationMatrix.translate)(translateX, translateY);

  var matrix = (0, _transformationMatrix.transform)(translationMatrix, //2
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