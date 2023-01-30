class CreateFluxos < ActiveRecord::Migration[7.0]
  def change
    create_table :fluxos do |t|
      t.string :curso
      t.text :nodes
      t.text :links
      t.timestamps
    end
  end
end
