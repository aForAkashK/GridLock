# Home category button artwork

Created with the built-in image generation tool at the user's explicit request.
The PNGs are stored one directory above this file as `home_levels.png`,
`home_daily.png`, `home_awards.png`, and `home_shop.png`. Each is a 1254×1254 RGBA PNG with native alpha;
original generated files are preserved. No image API key or new package is used.

Style references: `UI/Home_UI.png` and `assets/ui/buttons/play.webp`.
The Levels button is the master reference for the other three buttons.
All four assets keep their lower face empty for native labels. The app owns
LEVELS / DAILY / AWARDS / SHOP, disabled state, SOON captions and press feedback.
The resolver is `src/components/home/homeTileAssets.ts`.

## Prompt set

### Levels

Use case: stylized-concept. Create ONE production mobile puzzle game home menu
button asset for LEVELS, matching the attached Freeway Escape reference artwork
and existing green Play button. References are style references only, not edit
targets. Square 1024x1024 canvas, actual transparent background. Center a chunky
rounded square blue button occupying 92% canvas width and height including its
dark blue extruded bottom edge and soft shadow, front-on UI face, large corner
radius. Saturated sky-blue glossy toy plastic, light top-left, pale blue inner
bevel highlight, navy outline, tasteful soft shading like the reference's blue
daily challenge tile. Icon centered in the upper 60%: a small folded cream map
with a winding blue route, three gold circular level nodes and a tiny checkered
finish flag, chunky simplified forms, navy outlines, easily readable when button
displays at 80 pixels wide. Keep bottom 30% of button face clean blue EMPTY SPACE
for app-rendered label. No letters, numbers, words, watermark, extra UI, badge,
notifications or surrounding scene. Only one button, no sheet, no text. Maintain
visual weight and cartoon rendering of the existing reference.

### Shared sibling prompt

Use case: stylized-concept. Asset type: ONE home menu button for the Freeway
Escape mobile game. The attached blue map button is the MASTER STYLE REFERENCE.
Create its matching sibling. Match exactly the master button's square
proportions, navy outline thickness, big rounded corners, glossy toy plastic
shading, inner beveled rim, top-left highlight, soft shadow and dark extruded
bottom edge. Same front-on face, button fills same bounds in the square canvas,
actual transparent background. Keep icon entirely in upper 60% of the face.
Bottom 30% of button face must remain EMPTY for app-rendered labels. No text,
letters, numbers, badges, notifications, surrounding objects, scenes or watermark.
Only one centered button, no asset sheet. Match master rendering and icon scale.

Append the following subject to the shared prompt for each button:

- **Daily:** DAILY button: rich violet-purple face and purple-blue dark extruded
  edge. Main icon: chunky white tear-off calendar with a blue header, two rounded
  binder rings, a simple golden sun symbol centered on its white page, no digits
  or letters. Cream page, navy outlines, large readable silhouette.
- **Awards:** AWARDS button: rich golden amber-yellow face with orange-gold dark
  extruded edge. Main icon: a polished golden trophy cup with two round handles,
  a dark navy pedestal and one small embossed star on the cup. Strong navy
  outlines and warm highlights keep the gold trophy distinct from the amber
  background. Large readable silhouette.
- **Shop:** SHOP button: rich coral-pink face with deep raspberry dark extruded
  edge. Main icon: a small chunky white storefront with red-and-white striped
  awning, a dark blue doorway and two blue glass panes, navy outlines. Large
  readable silhouette.
