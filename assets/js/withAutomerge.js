import Automerge from 'automerge'

import { Editor } from 'slate'

const emptyDoc = new Uint8Array([
  133, 111, 74, 131, 104, 138, 32, 79, 0, 163, 2, 1, 16, 158, 204, 221, 96, 34,
  165, 68, 166, 177, 143, 201, 80, 54, 223, 162, 161, 1, 71, 66, 85, 144, 185,
  91, 151, 251, 124, 16, 31, 149, 79, 234, 55, 34, 139, 25, 163, 160, 53, 177,
  130, 207, 36, 80, 52, 161, 106, 30, 3, 139, 7, 1, 2, 3, 2, 19, 2, 35, 6, 53,
  16, 64, 2, 86, 2, 12, 1, 4, 2, 11, 17, 4, 19, 15, 21, 37, 33, 2, 35, 7, 52, 6,
  66, 9, 86, 9, 87, 61, 128, 1, 2, 127, 0, 127, 1, 127, 58, 127, 174, 144, 179,
  132, 6, 127, 14, 73, 110, 105, 116, 105, 97, 108, 105, 122, 97, 116, 105, 111,
  110, 127, 0, 127, 7, 0, 1, 57, 0, 0, 1, 127, 1, 2, 2, 126, 3, 4, 52, 5, 0, 7,
  51, 0, 0, 1, 127, 0, 0, 2, 127, 0, 0, 1, 126, 0, 6, 50, 1, 127, 8, 99, 104,
  105, 108, 100, 114, 101, 110, 0, 1, 126, 8, 99, 104, 105, 108, 100, 114, 101,
  110, 4, 116, 121, 112, 101, 0, 1, 127, 4, 116, 101, 120, 116, 0, 52, 58, 0, 3,
  1, 126, 55, 74, 53, 1, 1, 1, 2, 1, 1, 52, 122, 2, 0, 2, 1, 0, 4, 52, 1, 3, 0,
  127, 150, 1, 2, 0, 52, 22, 112, 97, 114, 97, 103, 114, 97, 112, 104, 84, 104,
  105, 115, 32, 105, 115, 32, 101, 100, 105, 116, 97, 98, 108, 101, 32, 112, 108,
  97, 105, 110, 32, 116, 101, 120, 116, 44, 32, 106, 117, 115, 116, 32, 108, 105,
  107, 101, 32, 97, 32, 60, 116, 101, 120, 116, 97, 114, 101, 97, 62, 33, 58, 0]
);

const removeTextOperation = (doc, op) => {
  const {path, offset} = op

  doc.children[0].children[0].text.deleteAt(offset, op.text)
}

const insertTextOperation = (doc, op) => {
  const {path, offset} = op

  doc.children[0].children[0].text.insertAt(offset, op.text)
}

function applyOperation(doc, op) {
  switch(op.type) {
    case "insert_text":
      return insertTextOperation(doc, op)

    case "remove_text":
      return removeTextOperation(doc, op)

    default:
      return doc
  }
}

async function makeChanges(editor, operations) {
  const doc = editor.doc

  let changed

  for await (let op of operations) {
    if (op.type === "set_selection") {
      continue;
    }

    changed = Automerge.change(doc, doc => applyOperation(doc, op))
  }

  editor.doc = changed || doc

  return Automerge.getChanges(doc, changed || doc)
}

export function withAutomerge(editor, options) {
  const { onChange } = editor

  const { pushEvent, data, userId } = options || {}

  editor.pushEvent = pushEvent

  const onError = (err) => console.error(`Error: ${err}`)

  if (!editor.doc)
    editor.doc = Automerge.load(emptyDoc, userId)

  const currentDoc = editor.doc;

  const externalDoc = Automerge.load(data || emptyDoc)

  const mergedDoc = Automerge.merge(externalDoc, currentDoc)

  Editor.withoutNormalizing(editor, () => {
    editor.children = JSON.parse(JSON.stringify(editor)).children

    editor.onChange()
  })

  editor.onChange = () => {
    const operations = editor.operations

    makeChanges(editor, operations)
      .then(editor.pushEvent("changes", {operations}))
      .catch(onError)

    onChange()
  }

  return editor
}