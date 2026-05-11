```tsx
                    {/* Chapter Prompt */}
                    {/* Inside chapters.map((chapter) => ... */}
                    <Dialog
                      onOpenChange={(open) => {
                        if (open) {
                          // Initialize the local draft with the saved content ONLY when opening
                          setActiveDraft(chapter.additionalPrompt || "");
                        }
                      }}
                    >
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Sparkles className="w-4 h-4 mr-2" /> Instructions
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[500px]">
                        <DialogHeader>
                          <DialogTitle>
                            Instructions: Chapter {chapter.number}
                          </DialogTitle>
                        </DialogHeader>

                        <div className="grid gap-4 py-4">
                          <div className="grid gap-2">
                            <Label>AI Focus & Style</Label>
                            <textarea
                              className="flex min-h-[150px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                              placeholder="e.g. Write in a noir style..."
                              /* Use the isolated activeDraft state here */
                              value={activeDraft}
                              onChange={(e) => setActiveDraft(e.target.value)}
                            />
                          </div>
                        </div>

                        <div className="flex justify-end gap-3">
                          <Button
                            variant="secondary"
                            onClick={async () => {
                              // 1. Update the Database
                              await db.chapters.update(chapter.id!, {
                                additionalPrompt: activeDraft,
                              });

                              // 2. Update the parent list ONLY ONCE (on Save)
                              setChapters((prev) =>
                                prev.map((ch) =>
                                  ch.id === chapter.id
                                    ? { ...ch, additionalPrompt: activeDraft }
                                    : ch,
                                ),
                              );

                              alert("Instructions saved!");
                            }}
                          >
                            <Save className="w-4 h-4 mr-2" /> Save Instructions
                          </Button>

                          <Button
                            onClick={() =>
                              generateChapterContent({
                                ...chapter,
                                additionalPrompt: activeDraft,
                              })
                            }
                          >
                            Generate
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
```