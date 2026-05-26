"use server";

export default async function buiAuthorServerEnhance() {
  console.log("Console from server");
  return {
    name: "test",
    description: "test"
  };
}