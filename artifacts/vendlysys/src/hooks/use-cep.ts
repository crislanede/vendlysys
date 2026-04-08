import { useState, useCallback } from "react";

export interface EnderecoViaCep {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  localidade: string;
  uf: string;
  erro?: boolean;
}

export interface EnderecoForm {
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  estado: string;
}

export const enderecoVazio: EnderecoForm = {
  cep: "",
  logradouro: "",
  numero: "",
  complemento: "",
  bairro: "",
  cidade: "",
  estado: "",
};

export function useCep() {
  const [buscandoCep, setBuscandoCep] = useState(false);
  const [erroCep, setErroCep] = useState("");

  const buscarCep = useCallback(async (cep: string, onResult: (end: Partial<EnderecoForm>) => void) => {
    const apenasNumeros = cep.replace(/\D/g, "");
    if (apenasNumeros.length !== 8) return;

    setBuscandoCep(true);
    setErroCep("");
    try {
      const res = await fetch(`https://viacep.com.br/ws/${apenasNumeros}/json/`);
      const data: EnderecoViaCep = await res.json();
      if (data.erro) {
        setErroCep("CEP não encontrado.");
        return;
      }
      onResult({
        logradouro: data.logradouro || "",
        complemento: data.complemento || "",
        bairro: data.bairro || "",
        cidade: data.localidade || "",
        estado: data.uf || "",
      });
    } catch {
      setErroCep("Erro ao buscar CEP. Verifique sua conexão.");
    } finally {
      setBuscandoCep(false);
    }
  }, []);

  return { buscarCep, buscandoCep, erroCep, setErroCep };
}

export function formatarCep(valor: string): string {
  const nums = valor.replace(/\D/g, "").slice(0, 8);
  if (nums.length > 5) return `${nums.slice(0, 5)}-${nums.slice(5)}`;
  return nums;
}
