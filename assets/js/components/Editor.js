import React, { useState, useMemo } from 'react'
import { createEditor } from 'slate'
import { Slate, Editable, withReact } from 'slate-react'
import { withHistory } from 'slate-history'

import { withAutomerge } from '../withAutomerge'

export const Editor = ({pushEvent, pushEventTo, handleEvent, ...props}) => {
  console.log(props)
  console.log(pushEvent)

  const [value, setValue] = useState(initialValue)
  const editor = useMemo(() => {
    const slateEditor = withHistory(withReact(createEditor()))

    const opts = {
      userId: "4bc3dc047e2442b9b3129e1447311b79",
      pushEvent,
      handleEvent,
    }

    return withAutomerge(slateEditor, opts)
  }, [])

  return (
    <Slate editor={editor} value={value} onChange={value => setValue(value)}>
      <Editable placeholder="Enter some plain text..." />
    </Slate>
  )
}

const initialValue = [
  {
    type: 'paragraph',
    children: [
      { text: 'This is editable plain text, just like a <textarea>!' },
    ],
  },
]
