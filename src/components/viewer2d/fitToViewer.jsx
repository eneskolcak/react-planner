import { scale, transform, translate, fromObject } from "transformation-matrix";

const limitZoomLevel = (value, matrix) => {
  let scaleLevel = matrix.a;

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
    d: scaleLevel,
  });
};

const set = (value, patch, action = null) => {
  value = Object.assign({}, value, patch, { lastAction: action });
  return Object.freeze(value);
};

const decompose = (value) => {
  let matrix = fromObject(value);

  return {
    scaleFactor: matrix.a,
    translationX: matrix.e,
    translationY: matrix.f,
  };
};

export const fitToViewer = (
  value,
  SVGAlignX = "ALIGN_COVER",
  SVGAlignY = "ALIGN_COVER"
) => {
  let { viewerWidth, viewerHeight, SVGMinX, SVGMinY, SVGWidth, SVGHeight } =
    value;

  let scaleX = viewerWidth / SVGWidth;
  let scaleY = viewerHeight / SVGHeight;
  let scaleLevel = Math.min(scaleX, scaleY);

  let scaleMatrix = scale(scaleLevel, scaleLevel);

  let translateX = -SVGMinX * scaleX;
  let translateY = -SVGMinY * scaleY;

  // after fitting, SVG and the viewer will match in width (1) or in height (2) or SVG will cover the container with preserving aspect ratio (0)
  if (scaleX < scaleY) {
    let remainderY = viewerHeight - scaleX * SVGHeight;

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
        let remainderX = viewerWidth - scaleY * SVGWidth; // calculate remainder in the other scale

        translateX = SVGMinX + Math.round(remainderX / 2); // center by the long edge
        break;

      default:
      //no op
    }
  } else {
    let remainderX = viewerWidth - scaleY * SVGWidth;

    //(2) match in height, meaning scaled SVGWidth <= viewerWidth
    switch (SVGAlignX) {
      case "ALIGN_LEFT":
        translateX = -SVGMinX * scaleLevel;
        break;

      case "ALIGN_CENTER":
        translateX = Math.round(remainderX / 2) - SVGMinX * scaleLevel;
        break;

      case "ALIGN_RIGHT":
        translateX = remainderX - SVGMinX * scaleLevel;
        break;

      case "ALIGN_COVER":
        scaleMatrix = scale(scaleX, scaleX); // (0) we must now match to short edge, in this case - width
        let remainderY = viewerHeight - scaleX * SVGHeight; // calculate remainder in the other scale

        translateY = SVGMinY + Math.round(remainderY / 2); // center by the long edge
        break;

      default:
      //no op
    }
  }

  const isZoomLevelGoingOutOfBounds = (value, scaleFactor) => {
    const { scaleFactor: curScaleFactor } = decompose(value);
    const lessThanScaleFactorMin =
      value.scaleFactorMin &&
      curScaleFactor * scaleFactor < value.scaleFactorMin;
    const moreThanScaleFactorMax =
      value.scaleFactorMax &&
      curScaleFactor * scaleFactor > value.scaleFactorMax;

    return (
      (lessThanScaleFactorMin && scaleFactor < 1) ||
      (moreThanScaleFactorMax && scaleFactor > 1)
    );
  };

  const translationMatrix = translate(translateX, translateY);

  const matrix = transform(
    translationMatrix, //2
    scaleMatrix //1
  );

  if (isZoomLevelGoingOutOfBounds(value, scaleLevel / value.d)) {
    // Do not allow scale and translation
    return set(value, {
      mode: "MODE_IDLE",
      startX: null,
      startY: null,
      endX: null,
      endY: null,
    });
  }

  return set(
    value,
    {
      mode: "MODE_IDLE",
      ...limitZoomLevel(value, matrix),
      startX: null,
      startY: null,
      endX: null,
      endY: null,
    },
    "ACTION_ZOOM"
  );
};
