#!/usr/bin/node

const basePath = process.cwd();
const { MODE } = require(`${basePath}/constants/blend_mode.js`);
const { NETWORK } = require(`${basePath}/constants/network.js`);

const network = NETWORK.ternoa;

const namePrefix = "Pxls";
//description for each NFT
const description = "Pxls";
const isSoulbound = false;
//royalty 0 to 100
const royalty = 5;
//Your collection id
const collectionId = 6;
//Available categories : Music, Art, Utility, Photography, Collectible, Virtual world, Meme, Game, NSFW
const categories = ["Art", "Collectible"];


const layerConfigurations = [
  
  {
    growEditionSizeTo: 10,
    layersOrder: [
      { name: "Body" },
      { name: "Mouth" },
      { name: "Nose" },
      { name: "Eyes" },
    ],
  },
  {
    growEditionSizeTo: 14,
    layersOrder: [
      { name: "Body" },
      { name: "Mouth" },
      { name: "Eyes" },
      { name: "Nose" },
      { name: "Head" },
      { name: "Chin" },
    ],
  },
  {
    growEditionSizeTo: 16,
    layersOrder: [
      { name: "Body" },
      { name: "Mouth" },
      { name: "Eyes" },
      { name: "Nose" },
      { name: "Head" }
    ],
  },
  {
    growEditionSizeTo: 30,
    layersOrder: [
      { name: "Body" },
      { name: "Mouth" },
      { name: "Eyes" },
      { name: "Nose" },
      { name: "Head" },
      { name: "Chin" },
      { name: "Accessories" },
    ],
  },
  {
    growEditionSizeTo: 30,
    layersOrder: [
      { name: "Body" },
      { name: "Mouth" },
      { name: "Eyes" },
      { name: "Nose" },
      { name: "Head" },
      { name: "Accessories" },
    ],
  }
];

//shuffle the layer configurations to randomize rarity generation
const shuffleLayerConfigurations = true;

const debugLogs = false;

// format size of your final NFT
const format = {
  width: 1000,
  height: 1000,
  smoothing: false,
  resolution: undefined, // ppi

  padEdition: 3,
  hexEdition: false,
};

const gif = {
  export: false,
  repeat: 0,
  quality: 100,
  delay: 500,
};

const text = {
  only: false,
  color: "#ffffff",
  size: 20,
  xGap: 40,
  yGap: 40,
  align: "left",
  baseline: "top",
  weight: "regular",
  family: "Courier",
  spacer: " => ",
};

const pixelFormat = {
  ratio: 2 / 128,
};

const background = {
  generate: true,
  brightness: "80%",
  static: false,
  default: "#000000",
};

const extraMetadata = {};

const rarityDelimiter = "#";

const uniqueDnaTorrance = 10000;

const preview = {
  thumbPerRow: 5,
  thumbWidth: 50,
  imageRatio: format.height / format.width,
  imageName: "preview.png",
};

const preview_gif = {
  numberOfImages: 5,
  order: "ASC", // ASC, DESC, MIXED
  repeat: 0,
  quality: 100,
  delay: 500,
  imageName: "preview.gif",
};

const DNA_DELIMITER = "-";

module.exports = {
  format,
  description,
  isSoulbound,
  royalty,
  collectionId,
  categories,
  background,
  uniqueDnaTorrance,
  layerConfigurations,
  rarityDelimiter,
  preview,
  shuffleLayerConfigurations,
  debugLogs,
  pixelFormat,
  text,
  namePrefix,
  network,
  gif,
  preview_gif,
  DNA_DELIMITER,
};
