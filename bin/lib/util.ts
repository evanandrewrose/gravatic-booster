import { Match } from "@/models/matchHistory";
import { access, constants, mkdir, writeFile } from "fs/promises";
import { join } from "path";

export const formatDate = (date: Date) => {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  const hour = date.getHours().toString().padStart(2, "0");
  const minute = date.getMinutes().toString().padStart(2, "0");
  const second = date.getSeconds().toString().padStart(2, "0");

  return `${year}-${month}-${day}@${hour}${minute}${second}`;
};

export const formatReplayName = (date: Date, match: Match) => {
  const [p1, p2] = match.players;
  const p1Race = p1.race.toLowerCase();
  const p2Race = p2.race.toLowerCase();

  return (
    `${formatDate(date)}_` +
    `${p1.toon}(${p1Race})` +
    "_vs_" +
    `${p2.toon}(${p2Race}).rep`
  );
};

export const createDirectoryUnlessExists = async (path: string) => {
  await mkdir(path, { recursive: true }).catch((err) => {
    if (err.code !== "EEXIST") throw err;
  });
};

export const downloadIntoDirectory = async (
  url: string,
  path: string,
  outputFileName: string
) => {
  const response = await fetch(url);
  const buffer = Buffer.from(await response.arrayBuffer());

  await writeFile(join(path, outputFileName), buffer);
};

export const fileExists = async (path: string) => {
  try {
    await access(path, constants.F_OK);
  } catch (err) {
    return false;
  }
  return true;
};
