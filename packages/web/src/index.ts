// Exports
export default removeBackground;
export type { ImageSource, Config };
export { removeBackground, preload };

// Imports
import { initInference, runInference } from './inference';
import { Config, validateConfig } from './schema';
import * as utils from './utils';
import { NdArray } from 'ndarray';
import * as codecs from './codecs';
import { memoize } from 'lodash';
import { ensureAbsoluteURI } from './url';
import { preload as preloadResources } from './resource';
type ImageSource = ImageData | ArrayBuffer | Uint8Array | Blob | URL | string;

const init = memoize(initInference, (config) => JSON.stringify(config));

async function preload(configuration?: Config): Promise<void> {
  const config = validateConfig(configuration);
  await preloadResources(config);
  return;
}
async function removeBackground(
  image: ImageSource,
  configuration?: Config
): Promise<Blob> {
  const { config, session } = await init(configuration);

  image = await imageSourceToImageData(image, config);

  const outImageTensor = await runInference(image, config, session);
  return await utils.imageEncode(
    outImageTensor,
    config.output.quality,
    config.output.format
  );
}

async function imageSourceToImageData(
  image: ImageSource,
  config: Config
): Promise<NdArray<Uint8Array>> {
  if (typeof image === 'string') {
    image = ensureAbsoluteURI(image, config.publicPath);
    image = new URL(image);
  }
  if (image instanceof URL) {
    const response = await fetch(image, {});
    image = await response.blob();
  }
  if (image instanceof ArrayBuffer || ArrayBuffer.isView(image)) {
    image = new Blob([image]);
  }
  if (image instanceof Blob) {
    image = await codecs.imageDecode(image);
  }

  return image as NdArray<Uint8Array>;
}
