"use server";

import { buiContainer } from "../../container/bui.container";

export default async function buiAuthorServerEnhance() {
  console.log("Console from server");

  // const ai = buiContainer.resolve("ai");
  return {
    name: "TEST",
    description: "DESCRIPTION",
  };
}
