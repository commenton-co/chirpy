import '@tensorflow/tfjs';

import * as toxicity from '@tensorflow-models/toxicity';
import { NextApiRequest, NextApiResponse } from 'next';

const MIN_PREDICTION_CONFIDENCE = 0.9;

export function getToxicModel() {
  const toxicModelPromise = toxicity.load(MIN_PREDICTION_CONFIDENCE, [
    'toxicity',
    'severe_toxicity',
    `identity_attack`,
    `insult`,
    `threat`,
    `sexual_explicit`,
    `obscene`,
  ]);

  // Save the ref to the global env to avoid reload the models between severless calls
  if (!global.toxicModelPromise) {
    global.toxicModelPromise = toxicModelPromise;
  }
  return global.toxicModelPromise;
}

export interface ICheckToxicText {
  matchedLabels: string[];
}

export async function checkToxicText(
  req: NextApiRequest,
  res: NextApiResponse<ICheckToxicText>,
): Promise<void> {
  const { text } = req.query as {
    [key: string]: string;
  };
  const model = await getToxicModel();
  const result = await model.classify(text);
  const resp: ICheckToxicText = result.reduce(
    (prev, item) => {
      if (item.results.some((r) => r.match)) {
        prev.matchedLabels.push(item.label.split('_').join(' '));
      }
      return prev;
    },
    { matchedLabels: [] } as ICheckToxicText,
  );
  res.status(200).json(resp);
}
