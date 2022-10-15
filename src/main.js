#!/usr/bin/node

const basePath = process.cwd();
const fs = require("fs");

if (!fs.existsSync(`${basePath}/node_modules/sha1`)) {
  console.error("You need to run npm install");
  process.exit();
}

let config;

try {
  config = require(`${basePath}/src/config.js`)
} catch (error) {
  console.error(`Syntax error: ${error.message} in src/config.js`);
  process.exit();
}

const { NETWORK } = require(`${basePath}/constants/network.js`);
const { freemem } = require('os');
const { collection } = require("./config");
const {
  Canvas,
  CanvasRenderingContext2d,
  CanvasRenderingContext2dInit,
  Image,
  SetSource
} = require(`${basePath}/node_modules/canvas/build/Release/canvas.node`);
const { DOMMatrix } = require(`${basePath}/node_modules/canvas/lib/DOMMatrix.js`);
const parseFont = require(`${basePath}/node_modules/canvas/lib/parse-font.js`);
CanvasRenderingContext2dInit(DOMMatrix, parseFont);

const sha1 = require(`${basePath}/node_modules/sha1`);
const buildDir = `${basePath}/build`;
const layersDir = `${basePath}/layers`;

let {
  description,
  isSoulbound,
  royalty,
  collectionId,
  categories,
  uniqueDnaTorrance,
  layerConfigurations,
  rarityDelimiter,
  shuffleLayerConfigurations,
  debugLogs,
  namePrefix,
  network,
  format,
  background,
  text,
  gif,
  DNA_DELIMITER,
} = config;

let loadedImages = {};
let layerConfigs = {};
var metadataList = [];
var attributesList = [];

if (DNA_DELIMITER == undefined) {
  DNA_DELIMITER = "-";
}

let HashlipsGiffer;

if (gif.export) {
  HashlipsGiffer = require(`${basePath}/modules/HashlipsGiffer.js`);
}

const buildSetup = () => {
  if (!fs.existsSync(buildDir)) {
    fs.mkdirSync(buildDir);
  }
  if (!fs.existsSync(`${buildDir}/json`)) {
    fs.mkdirSync(`${buildDir}/json`);
  }
  if (!fs.existsSync(`${buildDir}/images`)) {
    fs.mkdirSync(`${buildDir}/images`);
  }
  if (gif.export && !fs.existsSync(`${buildDir}/gifs`)) {
    fs.mkdirSync(`${buildDir}/gifs`);
  }
};

const getRarityWeight = (_str) => {
  if (_str.includes(rarityDelimiter)) {
    let nameWithoutExtension = _str.slice(0, -4);
    var nameWithoutWeight = Number(
      nameWithoutExtension.split(rarityDelimiter).pop()
    );
    if (isNaN(nameWithoutWeight)) {
      nameWithoutWeight = 1;
    }
    return nameWithoutWeight;
  }
  return 1;
};

const cleanName = (_str) => {
  let nameWithoutExtension = _str.slice(0, -4);
  var nameWithoutWeight = nameWithoutExtension.split(rarityDelimiter).shift();
  return nameWithoutWeight;
};

const getElements = (path, name) => {
  if (!fs.existsSync(path)) {
     console.error(`layers/${name} doesn't exist, make sure your layers/ folder matches your src/config.js`);
     process.exit();
  }

  let elements = [];
  fs
    .readdirSync(path)
    .filter((item) => !/(^|\/)\.[^\/\.]/g.test(item))
    .forEach((i, index) => {
      if (fs.statSync(`${path}/${i}`).isDirectory()) {
        elements = elements.concat(getElements(`${path}/${i}`, name));
        return;
      }
      if (i.includes(DNA_DELIMITER)) {
        console.error(`layer name can not contain DNA_DELIMITER (${DNA_DELIMITER}), please fix: ${i}`);
        return;
      }
      if (i.includes("\n")) {
        console.error(`layer name can not contain newlines, please fix: ${i}`);
        return;
      }

      if (text.only || loadedImages[`${name}/${i}`]) {
        elements.push({
          id: index,
          name: cleanName(i),
          layer: name,
          path: i,
          weight: getRarityWeight(i),
        });
      } else if (!(`${name}/${i}` in loadedImages)) {
        const loadedImage = new Image();

        loadedImage.onload = () => {
          elements.push({
            id: index,
            name: cleanName(i),
            layer: name,
            path: i,
            weight: getRarityWeight(i),
            loadedImage: loadedImage,
          });
          loadedImages[`${path}/${i}`] = loadedImage;
        };

        loadedImage.onerror = (e) => {
          console.error(`${e}: ${path}/${i}`);
          loadedImages[`${path}/${i}`] = undefined;
        };

        SetSource.call(loadedImage, `${path}/${i}`);
      }
    });

  return elements;
};

const layersSetup = (layersOrder) => {
  let layers = [];
  let index = 0;
  layersOrder.forEach(layerObj => {
    if (layerObj.name in layerConfigs) {
      if (layerConfigs[layerObj.name]) {
        layers.push(layerConfigs[layerObj.name]);
      }
      return
    }
    const elements = getElements(`${layersDir}/${layerObj.name}`, layerObj.name);

    if (!elements.length) {
      layerConfigs[layerObj.name] = undefined;
      return;
    }

    const config = {
      id: index++,
      elements: elements,
      name:
        layerObj.options && layerObj.options["displayName"] || layerObj.name,
      blend:
        layerObj.options && layerObj.options["blend"] || "source-over",
      opacity:
        layerObj.options && layerObj.options["opacity"] || 1,
      bypassDNA:
        layerObj.options && layerObj.options["bypassDNA"] || false,
      posX:
        layerObj.options && layerObj.options["posX"] || 0,
      posY:
        layerObj.options && layerObj.options["posY"] || 0,
      width:
        layerObj.options && layerObj.options["width"] || format.width,
      height:
        layerObj.options && layerObj.options["height"] || format.height,
    }

    layers.push(config);
    layerConfigs[layerObj.name] = config;
  });
  return layers;
};

const saveBuffer = (buffer, _editionCount) => {
  fs.writeFileSync(
    `${buildDir}/images/${_editionCount}.png`,
    buffer,
    () => {}
  );
  console.log(`Saved edition: ${_editionCount}`);
};

const genColor = () => {
  let hue = Math.floor(Math.random() * 360);
  let pastel = `hsl(${hue}, 100%, ${background.brightness})`;
  return pastel;
};

const drawBackground = (ctx) => {
  ctx.fillStyle = background.static ? background.default : genColor();
  ctx.fillRect(0, 0, format.width, format.height);
};

const addMetadata = (_dna, _edition, _extraMetadata) => {
  let tempMetadata = {
    title: `${namePrefix} #${_edition}`,
    description: description,
    media: `${_edition}.png`,
    edition: _edition,
    collection: collectionId,
    royalty: royalty,
    isSoulbound: isSoulbound,
    categories: categories,
    properties: attributesList,
    
  };
  metadataList.push(tempMetadata);
  attributesList = [];
};

const addAttributes = (_element) => {
  let selectedElement = _element.layer.selectedElement;
  let layer = _element.layer.name;
  attributesList.push({
    [layer]: selectedElement.name,
  });
};

const addText = (ctx, _sig, x, y, size) => {
  ctx.fillStyle = text.color;
  ctx.font = `${text.weight} ${size}pt ${text.family}`;
  ctx.textBaseline = text.baseline;
  ctx.textAlign = text.align;
  ctx.fillText(_sig, x, y);
};

const drawElements = (canvas, ctx, elements, _editionCount) => {
  let hashlipsGiffer;
  if (gif.export) {
    hashlipsGiffer = new HashlipsGiffer(
      canvas,
      ctx,
      `${buildDir}/gifs/${_editionCount}.gif`,
      gif.repeat,
      gif.quality,
      gif.delay
    );
    hashlipsGiffer.start();
  }

  if (background.generate) {
    drawBackground(ctx);
  }

  elements.forEach((element, _index) => {
    layer = element.layer;

    ctx.globalAlpha = layer.opacity;
    ctx.globalCompositeOperation = layer.blend;
    text.only
      ? addText(
          ctx,
          cleanName(element.path.split("/").pop()),
          text.xGap,
          text.yGap * (_index + 1),
          text.size
        )
      : ctx.drawImage(
          element.loadedImage,
          layer.posX,
          layer.posY,
          layer.width,
          layer.height
        );

    if (gif.export) {
      hashlipsGiffer.add();
    }
  });

  if (gif.export) {
    hashlipsGiffer.stop();
  }
};

/**
 * Cleaning function for DNA strings. When DNA strings include an option, it
 * is added to the filename with a ?setting=value query string. It needs to be
 * removed to properly access the file name before Drawing.
 *
 * @param {String} _dna The entire newDNA string
 * @returns Cleaned DNA string without querystring parameters.
 */
const removeQueryStrings = (_dna) => {
  const query = /(\?.*$)/;
  return _dna.replace(query, "");
};

const isDnaUnique = (_DnaList = new Set(), _dna = {}) => {
  const _hashedDNA = sha1(_dna.map(dna => dna.path).join(DNA_DELIMITER));
  return !_DnaList.has(_hashedDNA);
};

const createDna = (_layers) => {
  let randNum = [];
  let random;
  _layers.forEach((layer) => {
    var totalWeight = 0;
    layer.elements.forEach((element) => {
      totalWeight += element.weight;
    });
    // if totalWeight is 0, this stops it from erroring
    if (totalWeight == 0) {
      do {
        i = Math.floor(Math.random() * layer.elements.length);
      } while (!layer.elements[i])
    } else {
      // number between 0 - totalWeight
      random = Math.floor(Math.random() * totalWeight);
      for (var i = 0; i < layer.elements.length; i++) {
        // subtract the current weight from the random weight until we reach a sub zero value.
        random -= layer.elements[i].weight;
        if (random < 0) {
          break
        }
      }
    }
    return randNum.push({
      path: `${layer.elements[i].id}:${layer.elements[i].path}${
        layer.bypassDNA ? "?bypassDNA=true" : ""
      }`,
      layer: layerConfigs[layer.elements[i].layer],
      loadedImage: layer.elements[i].loadedImage,
      trait: layer.elements[i].path,
    });
  });
  return randNum;
};

const writeMetaData = (_data) => {
  fs.writeFileSync(`${buildDir}/json/_metadata.json`, _data);
};

const saveMetaDataSingleFile = (_editionCount) => {
  let metadata = metadataList.find((meta) => (meta.edition == null ? meta.custom_fields.edition : meta.edition) == _editionCount);
  debugLogs
    ? console.log(
        `Writing metadata for ${_editionCount}: ${JSON.stringify(metadata)}`
      )
    : null;
  fs.writeFileSync(
    `${buildDir}/json/${_editionCount}.json`,
    JSON.stringify(metadata, null, 2)
  );
};

function shuffle(array) {
  let randomIndex;
  array.forEach((currentElement, currentIndex) => {
    do {
      randomIndex = Math.floor(Math.random() * array.length);
    } while (!array[randomIndex])

    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex],
      currentElement,
    ];
  });
  return array;
}

const startCreating = () => {
  let failedCount = 0;
  let newDna = "";
  let abstractedIndexes = [];
  let dnaHashList = new Set();
  let existingEditions = new Set();
  if (fs.existsSync(`${basePath}/build/json/_metadata.json`)) {
    let rawdata = fs.readFileSync(`${basePath}/build/json/_metadata.json`);
    let data = JSON.parse(rawdata);
    data.forEach(element => {
      existingEditions.add(element.edition);
      dnaHashList.add(element.dna);
      metadataList.push(element);
    });
  }

  let offset = network == NETWORK.sol ? 0 : 1;

  for (layerconfiguration of layerConfigurations) {
    const layers = layersSetup(layerconfiguration[Object.keys(layerconfiguration).find(k => k.toLowerCase() == "layersorder")]);

    if (network != NETWORK.sol && layerconfiguration[Object.keys(layerconfiguration).find(k => k.toLowerCase() == "starteditionfrom")] != undefined) {
      offset = layerconfiguration[Object.keys(layerconfiguration).find(k => k.toLowerCase() == "starteditionfrom")];
    }
    const startFrom = offset;

    for (
      let i = offset;
      i < layerconfiguration[Object.keys(layerconfiguration).find(k => k.toLowerCase() == "groweditionsizeto")] + startFrom;
      i++
    ) {
      if (existingEditions.has(i)) {
        console.log("Edition exists!");
      } else {
        abstractedIndexes[i] = [layers, layerconfiguration[Object.keys(layerconfiguration).find(k => k.toLowerCase() == "extrametadata")]];
      }
      offset++;
    }
  }

  lowMemory =
    freemem() < format.width * format.height * (background.generate ? 3 : 4) * abstractedIndexes.filter(val => val != undefined).length;

  let globalCanvas, globalCtx;

  if (lowMemory) {
    globalCanvas = new Canvas(format.width, format.height);
    globalCtx = new CanvasRenderingContext2d(globalCanvas, { alpha: !background.generate });
    globalCtx.imageSmoothingEnabled = format.smoothing;
  }

  if (shuffleLayerConfigurations) {
    abstractedIndexes = shuffle(abstractedIndexes);
  }

  debugLogs
    ? console.log("Editions left to create: ", abstractedIndexes)
    : null;

   abstractedIndexes.every((layers, abstractedIndex) => {
    for (;; failedCount++) {
      newDna = createDna(layers[0]);

      if (isDnaUnique(dnaHashList, newDna)) {
        break;
      }
      console.log("DNA exists!");

      if (failedCount >= uniqueDnaTorrance) {
        console.log(
          `You need more layers or elements to grow your edition to ${abstractedIndexes.filter(val => val != undefined).length} artworks!`
        );
        return false;
      }
    }

    if (format.hexEdition) {
      abstractedIndex = abstractedIndex.toString(16);
    }
    if (format.padEdition) {
      abstractedIndex = "0".repeat(format.padEdition - String(abstractedIndex).length) + abstractedIndex;
    }

    if (lowMemory) {
      if (!background.generate) {
        globalCtx.clearRect(0, 0, format.width, format.height);
      }
      drawElements(globalCanvas, globalCtx, newDna, abstractedIndex);

      saveBuffer(globalCanvas.toBuffer("image/png", { resolution: format.resolution }), abstractedIndex);
    } else {
      new Promise(resolve => {
        const canvas = new Canvas(format.width, format.height);
        const ctx = new CanvasRenderingContext2d(canvas, { alpha: !background.generate });
        ctx.imageSmoothingEnabled = format.smoothing;

        drawElements(canvas, ctx, newDna, abstractedIndex);

        canvas.toBuffer((_, buffer) =>
          resolve(buffer)
        , "image/png", { resolution: format.resolution })
      }).then(buffer =>
        saveBuffer(buffer, abstractedIndex)
      );
    }

    newDna.forEach((layer, i) => {
      addAttributes({
        layer: {
          name: layers[0][i].name,
          selectedElement: {
            name: cleanName(layer.trait),
          },
        },
      });
    });

    addMetadata(newDna, abstractedIndex, layers[1]);
    saveMetaDataSingleFile(abstractedIndex);
    console.log(
      `Created edition: ${abstractedIndex}, with DNA: ${sha1(
        newDna.map(dna => dna.path).join(DNA_DELIMITER)
      )}`
    );
    dnaHashList.add(sha1(newDna.map(dna => dna.path).join(DNA_DELIMITER)));

    return true;
  });
  writeMetaData(JSON.stringify(metadataList, null, 2));
};

module.exports = { startCreating, buildSetup, getElements };
