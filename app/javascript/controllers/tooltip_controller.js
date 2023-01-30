import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  connect() {
    console.log("Tooltip controller")
    new bootstrap.Tooltip(this.element)
  }
}
