/** Independent default appearances by vehicle type and colour. Never sold. */
export const CATEGORIES = [
  {
    id: "car",
    title: "Cars",
    icon: require("../../../assets/game/vehicles/car/car_red.webp"),
  },
  {
    id: "truck",
    title: "Trucks",
    icon: require("../../../assets/game/vehicles/truck/truck_blue.webp"),
  },
  {
    id: "bus",
    title: "Buses",
    icon: require("../../../assets/game/vehicles/bus/bus_blue.webp"),
  },
] as const;
export type ShopCategory = (typeof CATEGORIES)[number]["id"];
export const CLASSIC_COLOURS = [
  {
    id: "red",
    title: "Classic Red",
    edge: "#ffbd46",
    top: "#8c2735",
    bottom: "#271728",
  },
  {
    id: "blue",
    title: "Sky Blue",
    edge: "#259de6",
    top: "#145b99",
    bottom: "#072b49",
  },
  {
    id: "yellow",
    title: "Sunny Yellow",
    edge: "#c5a446",
    top: "#826323",
    bottom: "#332919",
  },
  {
    id: "green",
    title: "Lime Green",
    edge: "#08ba81",
    top: "#006c50",
    bottom: "#062b28",
  },
  {
    id: "purple",
    title: "Royal Purple",
    edge: "#8953e0",
    top: "#502ca0",
    bottom: "#201b4e",
  },
  {
    id: "orange",
    title: "Vibrant Orange",
    edge: "#b87b36",
    top: "#94501e",
    bottom: "#392317",
  },
] as const;
export const classicAssets = {
  car: [
    require("../../../assets/game/vehicles/car/car_red.webp"),
    require("../../../assets/game/vehicles/car/car_blue.webp"),
    require("../../../assets/game/vehicles/car/car_yellow.webp"),
    require("../../../assets/game/vehicles/car/car_green.webp"),
    require("../../../assets/game/vehicles/car/car_purple.webp"),
    require("../../../assets/game/vehicles/car/car_orange.webp"),
  ],
  truck: [
    require("../../../assets/game/vehicles/truck/truck_red.webp"),
    require("../../../assets/game/vehicles/truck/truck_blue.webp"),
    require("../../../assets/game/vehicles/truck/truck_yellow.webp"),
    require("../../../assets/game/vehicles/truck/truck_green.webp"),
    require("../../../assets/game/vehicles/truck/truck_purple.webp"),
    require("../../../assets/game/vehicles/truck/truck_orange.webp"),
  ],
  bus: [
    require("../../../assets/game/vehicles/bus/bus_red.webp"),
    require("../../../assets/game/vehicles/bus/bus_blue.webp"),
    require("../../../assets/game/vehicles/bus/bus_yellow.webp"),
    require("../../../assets/game/vehicles/bus/bus_green.webp"),
    require("../../../assets/game/vehicles/bus/bus_purple.webp"),
    require("../../../assets/game/vehicles/bus/bus_orange.webp"),
  ],
} as const;
