defmodule MyApp.Doc do
  use Agent

  def start_link(slug: slug, value: value) do
    Agent.start_link(fn -> value end, name: via(slug))
  end

  def get_doc(document_pid) do
    Agent.get(document_pid, & &1)
  end

  def apply_changes(document_pid, changes) do
    Agent.update(document_pid, fn  doc ->
      Automerge.apply_changes(doc, changes)
    end)

    Agent.get(document_pid, & &1)
  end

  defp via(slug), do: {:via, Registry, {MyApp.DocumentRegistry, slug}}
end
