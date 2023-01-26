Rails.application.routes.draw do
  # Define your application routes per the DSL in https://guides.rubyonrails.org/routing.html

  # Defines the root path route ("/")
  # root "articles#index"
  root "sigab#index", as: "index"
  get "/fluxo/:id", to: "sigab#fluxo", as: "fluxo" 
end
