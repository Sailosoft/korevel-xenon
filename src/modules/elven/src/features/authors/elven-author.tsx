import { Button, Card, EmptyState, Input, Label, Table } from "@heroui/react";
import ElvenModal from "../../components/elven.modal";
import useElvenContext from "../../hooks/use-elven-context";
import useElvenModal from "../../hooks/use-elven-modal";
import { Icon, Pencil, Plus, Trash2 } from "lucide-react";
import { ElvenDataGrid } from "../../components/elven.datagrid";
import { ElvenAuthor, ElvenColumn } from "../../interfaces/elven.interface";
import { elvenAuthorModule } from "./elven-author.module";
import { useLiveQuery } from "dexie-react-hooks";
import { useState } from "react";

export default function ElvenAuthorComponent() {
  const { author: authorData, db } = useElvenContext();
  const {
    openModal: openAuthorModal,
    isOpen,
    closeModal: closeAuthorModal,
  } = useElvenModal();
  const authors = useLiveQuery(() => db.authors.toArray(), []) || [];

  const columns: ElvenColumn<ElvenAuthor>[] = [
    ...elvenAuthorModule.columns,
    {
      key: "actions",
      label: "Actions",
      render: (item) => (
        <Button variant="primary" onPress={() => openModal()}>
          <Plus size={18} /> Add Author
        </Button>
      ),
    },
  ];

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
    authorData.modal.closeModal();
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
      <div className="space-y-4 py-4 text-black">
        <Card className="flex">
          <Button variant="primary" onPress={() => openModal()}>
            <Plus size={18} /> Add Author
          </Button>
        </Card>
        <Card>
          <Table aria-label="Authors table">
            <Table.ScrollContainer>
              <Table.Content aria-label="Team members">
                <Table.Header>
                  <Table.Column isRowHeader>ID</Table.Column>
                  <Table.Column>NAME</Table.Column>
                  <Table.Column className="text-end">Actions</Table.Column>
                </Table.Header>
                <Table.Body
                  renderEmptyState={() => (
                    <EmptyState className="flex h-full w-full flex-col items-center justify-center gap-4 text-center">
                      <span className="text-sm text-muted">
                        No results found
                      </span>
                    </EmptyState>
                  )}
                >
                  {authors.map((author) => (
                    <Table.Row key={author.id}>
                      <Table.Cell>{author.id}</Table.Cell>
                      <Table.Cell>{author.name}</Table.Cell>
                      <Table.Cell>
                        <div className="flex gap-2 justify-center">
                          <Button
                            isIconOnly
                            size="sm"
                            variant="outline"
                            onPress={() => {}}
                          >
                            <Pencil size={16} />
                          </Button>
                          <Button
                            isIconOnly
                            size="sm"
                            variant="danger"
                            onPress={() => {}}
                          >
                            <Trash2 size={16} />
                          </Button>
                        </div>
                      </Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table.Content>
            </Table.ScrollContainer>
          </Table>
        </Card>
        <ElvenModal
          title={editingAuthor ? "Edit Author" : "Add New Author"}
          isOpen={isOpen}
          onClose={() => closeAuthorModal()}
          actionLabel={editingAuthor ? "Update" : "Create"}
          onAction={handleSave}
          size="md"
        >
          <div className="space-y-4 py-2">
            <Label>Name</Label>
            <Input
              placeholder="Enter author name"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
            />
            {/* <Label>Email</Label> */}
            {/* <Input
              placeholder="Enter email address"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
            /> */}
          </div>
        </ElvenModal>
      </div>
    </ElvenModal>
  );
}
