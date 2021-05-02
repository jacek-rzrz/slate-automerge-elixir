defmodule MyAppWeb.PageLive do
  use MyAppWeb, :live_view

  alias MyApp.DocSet

  # This is our default document. If one does not currently exist we seed it with this value. This is evaluated at
  # compile time and you might need to clear _build for this to be re-evaluated.
  @empty_doc %{
               "children" => [
                 %{
                   "type" => "paragraph",
                   "children" => [
                     %{
                       "text" => Automerge.text()
                     }
                   ]
                 }
               ]
             }
             |> Automerge.from!()
             |> Automerge.save()

  ## LiveView fn's

  @impl true
  def mount(params = %{"doc_slug" => doc_slug}, _session, socket) do
    # Lookup our doc or create a new document with the default value
    doc = DocSet.get_or_create_doc(doc_slug, @empty_doc)

    # Subscribe to the document topic so we will get broadcasts when changes occur.
    MyAppWeb.Endpoint.subscribe(document_topic(doc_slug))

    {
      :ok,
      socket
      # Assign our doc_slug so we can look up the document later
      |> assign(doc_slug: doc_slug)
      # Unique for each user id
      |> assign(actor_id: actor_id())
      # Our byte ([131, 91, etc...]) encoded document to be loaded by the frontend.
      |> assign(document: doc)
    }
  end

  @impl true
  def handle_event("changes", params = %{"changes" => changes}, socket) do
    # Encode our changes (see below why this is needed)
    changes = encode_changes(changes)

    if changes do
      MyAppWeb.Endpoint.broadcast!(document_topic(socket.assigns.doc_slug), "changes", %{
        changes: changes
      })
    end

    {:noreply, socket}
  end

  def handle_info(
        %Phoenix.Socket.Broadcast{event: "changes", payload: %{changes: changes}},
        socket
      ) do
    doc = DocSet.apply_changes!(socket.assigns.doc_slug, changes)

    {
      :noreply,
      socket
      |> push_event("changes", %{changes: changes})
      |> assign(document: doc)
    }
  end

  # Each unique individual will be assigned a hex actor_id. Hex as this does not remain a string.
  defp actor_id(), do: UUID.uuid4(:hex)

  # encode_changes/1 is a hack around the need to implement Phoenix.Socket.Serializer as  Phoenix.Socket.V2.JSONSerializer
  # does not support Uint8Array and the default encoding hands us something like this:
  # [%{"0" => 131, etc...}]
  # Where we have an key, value indexed map and the key is a string and the map is out of order.
  defp encode_changes([]), do: nil

  defp encode_changes(changes) do
    Enum.reduce(changes, [], fn change, acc ->
      change =
        for index <- 0..(Enum.count(change) - 1), reduce: [] do
          acc -> List.insert_at(acc, index, Map.get(change, "#{index}"))
        end

      [change] ++ acc
    end)
  end

  # Helper function for seeing what our text state is.
  defp server_doc(document) do
    document
    |> Automerge.load()
    |> Automerge.get_document()
    |> get_in([
      "children",
      Access.at(0),
      "children",
      Access.at(0),
      "text"
    ])
    |> to_string
  end

  defp document_topic(doc_slug) do
    "document:#{doc_slug}"
  end
end
