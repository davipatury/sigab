import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  connect() {
    console.log("Popover controller")
    const popover = new bootstrap.Popover(this.element, { trigger: 'focus', html: true })
  }
}
