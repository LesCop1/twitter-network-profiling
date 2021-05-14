import express, { Request, Response } from "express";
import { PythonShell } from "python-shell";
import OccurrenceArray from "../helpers/OccurrenceArray";

const router = express.Router();

function getColor(proximity: number) {
  if (0 <= proximity && proximity < 2) {
    return "red";
  } else if (2 <= proximity && proximity < 7) {
    return "orange";
  } else if (7 <= proximity && proximity <= 10) {
    return "green";
  } else return "blue";
}

let avgTimePerMentions = 750;

router.get("/search", async (req: Request, res: Response) => {
  const { target, tweetLimit, relationLimit, depth } = <
    { target: string; tweetLimit: string; relationLimit: string; depth: string }
  >(<unknown>req.query);
  let id = 0;

  const nodes: [
    {
      id: number;
      name: string;
      color: string;
      val?: number;
      bestStr?: string;
      bestVal?: number;
    }?
  ] = [
    {
      id: id++,
      name: target,
      color: "blue",
      val: 12,
    },
  ];
  const links: [{ source: number; target: number; proximity?: number }?] = [];
  const names: string[] = [target];

  let targetOutput: string[] = [];
  try {
    targetOutput = await new Promise((resolve, reject) => {
      PythonShell.run(
        "./api/scripts/exec_twint.py",
        {
          args: [target, String(tweetLimit)],
        },
        (err, output) => {
          if (!err && output) resolve(output);
          reject(err);
        }
      );
    });
  } catch {
    return res.status(400).send({
      error: "Account is private or does not exists.",
    });
  }

  const depth0Relations = new OccurrenceArray(target);
  for (const line of targetOutput) {
    if (line.match(/^\d.*@/)) {
      const tweet = line.substring(line.indexOf(">") + 2);
      const tweetSplits = tweet.split(/[^\w@]+/);
      for (const tweetSplit of tweetSplits) {
        if (tweetSplit.match(/^@/))
          depth0Relations.add(tweetSplit.substring(1));
      }
    }
  }
  targetOutput = null;
  depth0Relations.sortByOccurrence();
  depth0Relations.keepMax(Number(relationLimit));

  const depth0HighestOccurrence = depth0Relations.getOccurrenceByIndex(0);
  const depth0LowestOccurrence = depth0Relations.getOccurrenceByIndex(
    depth0Relations.size() - 1
  );
  nodes[0].bestStr = depth0Relations.getKeyByIndex(0);
  nodes[0].bestVal = depth0HighestOccurrence;
  for (let i = 0; i < depth0Relations.size(); i++) {
    const name = depth0Relations.getKeyByIndex(i);
    const occu = depth0Relations.getOccurrence(name);
    const proximity = Math.floor(
      (Math.max(occu - depth0LowestOccurrence, 1) /
        Math.max(depth0HighestOccurrence - depth0LowestOccurrence, 1)) *
        10
    );

    nodes.push({
      id: id,
      name,
      color: getColor(proximity),
    });
    links.push({
      source: 0,
      target: id,
    });
    names.push(name);
    id++;
  }

  if (Number(depth) === 2) {
    const timeStart = Date.now();

    const depth1AccountsPromises = depth0Relations
      .getKeys()
      .map(async (key) => {
        return await new Promise((resolve) => {
          PythonShell.run(
            "./api/scripts/exec_twint.py",
            {
              args: [key, String(tweetLimit)],
            },
            (err, output) => {
              resolve(output);
            }
          );
        });
      });
    // @ts-ignore
    const depth1Accounts: [string[]] = await Promise.all(
      depth1AccountsPromises
    );

    for (let i = 0; i < depth0Relations.size(); i++) {
      if (depth1Accounts[i]) {
        const depth1Relations = new OccurrenceArray(
          depth0Relations.getKeyByIndex(i)
        );

        for (const line of depth1Accounts[i]) {
          if (line.match(/^\d.*@/)) {
            const tweet = line.substring(line.indexOf(">") + 2);
            const tweetSplits = tweet.split(/[^\w@]+/);
            for (const tweetSplit of tweetSplits) {
              if (tweetSplit.match(/^@/))
                depth1Relations.add(tweetSplit.substring(1));
            }
          }
        }
        depth1Accounts[i] = null;
        depth1Relations.sortByOccurrence();
        depth1Relations.keepMax(Number(relationLimit));

        const sourceId = names.indexOf(depth0Relations.getKeyByIndex(i));

        if (depth1Relations.size() > 0) {
          nodes[sourceId].bestStr = depth1Relations.getKeyByIndex(0);
          nodes[sourceId].bestVal = depth1Relations.getOccurrenceByIndex(0);
        }

        for (let j = 0; j < depth1Relations.size(); j++) {
          const targetName = depth1Relations.getKeyByIndex(j);
          const targetId = names.indexOf(targetName);

          if (targetId === -1) {
            nodes.push({
              id: id,
              name: targetName,
              color: "purple",
            });
            links.push({
              source: sourceId,
              target: id++,
            });
            names.push(targetName);
          } else {
            links.push({
              source: sourceId,
              target: targetId,
            });
          }
        }
      }
    }
    const timeEnd = Date.now();
    avgTimePerMentions = (timeEnd - timeStart) / depth0Relations.size();
  }

  return res.send({
    data: {
      nodes,
      links,
    },
  });
});

router.get("/stats", async (req: Request, res: Response) => {
  const { target, tweetLimit, relationLimit } = <
    { target: string; tweetLimit: number; relationLimit: number }
  >(<unknown>req.query);

  let targetOutput: string[] = [];
  try {
    targetOutput = await new Promise((resolve, reject) => {
      PythonShell.run(
        "./api/scripts/exec_twint.py",
        {
          args: [target, String(tweetLimit)],
        },
        (err, output) => {
          if (!err && output) resolve(output);
          reject(err);
        }
      );
    });
  } catch {
    return res.status(400).end();
  }

  const mentions = new OccurrenceArray(target);
  for (const line of targetOutput) {
    if (line.match(/^\d.*@/)) {
      const tweet = line.substring(line.indexOf(">") + 2);
      const tweetSplits = tweet.split(/[^\w@]+/);
      for (const tweetSplit of tweetSplits) {
        if (tweetSplit.match(/^@/)) mentions.add(tweetSplit.substring(1));
      }
    }
  }
  targetOutput = null;

  return res.send({
    numberOfMentions: Math.min(mentions.size(), relationLimit),
    avgTimePerMentions: avgTimePerMentions,
  });
});

export default router;
