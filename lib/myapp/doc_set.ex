defmodule MyApp.DocSet do
  use DynamicSupervisor

  alias MyApp.Doc

  def start_link(_arg) do
    DynamicSupervisor.start_link(__MODULE__, [], name: __MODULE__)
  end

  def create_doc(game_name) do
    # Shorthand to retrieve the child specification from the `child_spec/1` method of the given module.
    child_specification = {Game, game_name}

    DynamicSupervisor.start_child(__MODULE__, child_specification)
  end

  def get_or_create_doc(doc_slug, default_value) do
    case get_agent(doc_slug) do
      nil ->
        # Notice how we load the Automerge document here.
        doc = Automerge.load(default_value)

        DynamicSupervisor.start_child(
          __MODULE__,
          {MyApp.Doc, slug: doc_slug, value: doc}
        )

        Automerge.load(default_value)

      document_pid ->
        Doc.get_doc(document_pid) |> Automerge.save()
    end
  end

  def apply_changes!(doc_slug, changes) do
    case get_agent(doc_slug) do
      nil ->
        raise "Document does not exist!"

      document_pid ->
        document_pid
        |> Doc.apply_changes(changes)
        |> Automerge.save()
    end
  end

  @impl true
  def init(_arg) do
    DynamicSupervisor.init(strategy: :one_for_one)
  end

  defp get_agent(doc_slug) do
    case Registry.lookup(MyApp.DocumentRegistry, doc_slug) do
      [] -> nil
      resp -> resp |> hd() |> elem(0)
    end
  end
end
