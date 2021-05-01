defmodule MyAppWeb.PageLive do
  use MyAppWeb, :live_view

  @impl true
  def mount(_params, _session, socket) do
    {:ok, socket}
  end

  def handle_event("changes", _params, socket) do
    {:noreply, socket}
  end
end
