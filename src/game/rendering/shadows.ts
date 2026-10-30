/** Bake the four supported footprint shadows once, rather than blur per frame. */
import { BlurStyle, Skia, type SkImage } from "@shopify/react-native-skia";

const CELL = 128;
const PADDING = 24;
type Shadow = { image: SkImage; padX: number; padY: number };
const cache = new Map<string, Shadow | null>();

export function vehicleShadow(width: number, height: number): Shadow | null {
  const key = `${width}x${height}`;
  if (!["1x2", "2x1", "1x3", "3x1"].includes(key)) {
    return null;
  }
  if (cache.has(key)) {
    return cache.get(key)!;
  }
  const w = width * CELL;
  const h = height * CELL;
  // A CPU surface makes the texture independent of a particular Canvas/context.
  const surface = Skia.Surface.Make(w + PADDING * 2, h + PADDING * 2);
  if (!surface) {
    cache.set(key, null);
    return null;
  }
  const paint = Skia.Paint();
  paint.setColor(Skia.Color("rgba(0,0,0,0.32)"));
  paint.setAntiAlias(true);
  const blur = Skia.MaskFilter.MakeBlur(BlurStyle.Normal, 9, true);
  paint.setMaskFilter(blur);
  surface.getCanvas().clear(Skia.Color("transparent"));
  surface
    .getCanvas()
    .drawRRect(
      Skia.RRectXY(
        Skia.XYWHRect(
          PADDING + w * 0.09,
          PADDING + h * 0.06,
          w * 0.82,
          h * 0.88
        ),
        33,
        33
      ),
      paint
    );
  surface.flush();
  const shadow = {
    image: surface.makeImageSnapshot(),
    padX: PADDING / w,
    padY: PADDING / h,
  };
  surface.dispose();
  paint.dispose();
  blur.dispose();
  cache.set(key, shadow);
  return shadow;
}
