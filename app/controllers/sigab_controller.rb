class SigabController < ActionController::Base
  def index

  end

  def fluxos
    @fluxos = Fluxo.all
  end

  def fluxo
    @fluxo = Fluxo.find(params[:id])
  end

  def saldo_ru
    
  end

  def tabela_ru

  end
end
