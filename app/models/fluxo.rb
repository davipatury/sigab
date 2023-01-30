class Fluxo < ApplicationRecord
  serialize :nodes, Array
  serialize :links, Array
end
