import React, { useState, useEffect, useMemo } from 'react'
import { createEditor } from 'slate'
import { Slate, Editable, withReact } from 'slate-react'
import { withHistory } from 'slate-history'

import { withAutomerge } from '../withAutomerge'

import Automerge from 'automerge'

export const Editor = ({pushEvent, pushEventTo, handleEvent, document, actorId, ...props}) => {
  const [value, setValue] = useState(() => {
    const doc = Automerge.load(new Uint8Array(document))

    return JSON.parse(JSON.stringify(doc)).children
  })

  const editor = useMemo(() => {
    const slateEditor = withHistory(withReact(createEditor()))

    const opts = {
      actorId,
      document,
      pushEvent,
      handleEvent,
    }

    return withAutomerge(slateEditor, opts)
  }, [])

  // Sync selection data.
  useEffect(() => {
    if (!handleEvent) return
    handleEvent(`changes`, ({changes: changes}) => {
      const [doc, patch] = Automerge.applyChanges(editor.doc, changes.map(change => new Uint8Array(change)))
      editor.doc = doc
    })

    return () => {

    }
  }, [handleEvent])


  return (
    <Slate editor={editor} value={value} onChange={value => setValue(value)}>
      <Editable placeholder="Enter some plain text..." />
    </Slate>
  )
}
