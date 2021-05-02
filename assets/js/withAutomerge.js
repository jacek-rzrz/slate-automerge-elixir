import Automerge from 'automerge'

import { Editor } from 'slate'

/// Helpers for converting Slate Ops into Automerge operations.

const removeTextOperation = (doc, op) => {
  const {path, offset, text} = op

  doc.children[0].children[0].text.deleteAt(offset, text.length)
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

  let changed = doc

  for await (let op of operations) {
    if (op.type === "set_selection") {
      continue;
    }

    changed = Automerge.change(doc, doc => applyOperation(doc, op))
  }

  editor.doc = changed

  return Automerge.getChanges(doc, changed)
}

/// Our Memo function

export function withAutomerge(editor, options) {
  const { onChange } = editor

  const { pushEvent, userId, document } = options || {}

  // Convert our document into a Uint8Array so it can be loaded.
  const bytes = new Uint8Array(document)

  const onError = (err) => console.error(`Error: ${err}`)

  if (!editor.doc)
    editor.doc = Automerge.load(bytes, userId)

  Editor.withoutNormalizing(editor, () => {
    editor.children = JSON.parse(JSON.stringify(editor)).children

    editor.onChange()
  })

  editor.onChange = () => {
    const operations = editor.operations

    makeChanges(editor, operations)
      .then(changes => {
        // Push our changes to Elixir for them to be broadcasted
        pushEvent("changes", {changes})
      })
      .catch(onError)

    onChange()
  }

  return editor
}