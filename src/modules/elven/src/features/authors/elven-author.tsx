import { Button, Card, EmptyState, Input, Label, Table } from "@heroui/react";
import ElvenModal from "../../components/elven.modal";
import useElvenContext from "../../hooks/use-elven-context";
import useElvenModal from "../../hooks/use-elven-modal";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { ElvenAuthor, ElvenColumn } from "../../interfaces/elven.interface";
import { elvenAuthorModule } from "./elven-author.module";
import { useLiveQuery } from "dexie-react-hooks";
import { useState } from "react";
import { ElvenDataGrid } from "../../components/elven.datagrid";

export default function ElvenAuthorComponent() {
  const { author: authorData, db } = useElvenContext();
  const {
    openModal: openAuthorModal,
    isOpen,
    closeModal: closeAuthorModal,
  } = useElvenModal();

  const authors = useLiveQuery(() => db.authors.toArray(), []) || [];

  const [editingAuthor, setEditingAuthor] = useState<ElvenAuthor | null>(null);
  const [formData, setFormData] = useState({ name: "" });

  const openModal = (author?: ElvenAuthor) => {
    if (author) {
      setEditingAuthor(author);
      setFormData({ name: author.name });
    } else {
      setEditingAuthor(null);
      setFormData({ name: "" });
    }
    openAuthorModal();
  };

  const handleSave = async () => {
    if (editingAuthor?.id) {
      await db.authors.update(editingAuthor.id, formData);
    } else {
      await db.authors.add(formData);
    }
    closeAuthorModal(); // Close the entry modal
  };

  const handleDelete = async (id: number) => {
    if (confirm("Delete this author?")) {
      await db.authors.delete(id);
    }
  };

  return (
    <ElvenModal
      isOpen={authorData.modal.isOpen}
      onClose={authorData.modal.closeModal}
      title="Authors"
      actionLabel=""
      onAction={() => {}}
      hideAction={true}
      size="cover"
    >
      {/* Changed text-black to text-foreground and added bg-background to fix gray/contrast issues */}
      <div className="space-y-4 p-4">
        <Card className="flex p-4 border-none shadow-sm">
          <Button variant="primary" onPress={() => openModal()}>
            <Plus size={18} /> Add Author
          </Button>
        </Card>

        <Card className="border-none shadow-sm">
          <ElvenDataGrid<ElvenAuthor>
            data={authors}
            label="Authors"
            columns={[
              ...elvenAuthorModule.columns,
              {
                key: "actions",
                label: "Actions",
                render: (author: ElvenAuthor) => (
                  <div className="flex gap-2 justify-end">
                    <Button
                      isIconOnly
                      size="sm"
                      variant="secondary"
                      onPress={() => openModal(author)}
                    >
                      <Pencil size={16} />
                    </Button>
                    <Button
                      isIconOnly
                      size="sm"
                      variant="danger"
                      onPress={() => author.id && handleDelete(author.id)}
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                ),
              },
            ]}
          />
        </Card>

        {/* Input Modal for Add/Edit */}
        <ElvenModal
          title={editingAuthor ? "Edit Author" : "Add New Author"}
          isOpen={isOpen}
          onClose={() => closeAuthorModal()}
          actionLabel={editingAuthor ? "Update" : "Create"}
          onAction={handleSave}
          size="md"
        >
          <div className="space-y-4 p-2 text-foreground">
            <div className="flex flex-col gap-2">
              <Label>Name</Label>
              <Input
                placeholder="Enter author name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />
            </div>
          </div>
        </ElvenModal>
      </div>
    </ElvenModal>
  );
}
