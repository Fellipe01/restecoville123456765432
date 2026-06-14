import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Política de Privacidade',
  robots: { index: false },
}

export default function PrivacidadePage() {
  const updated = '14 de junho de 2026'

  return (
    <main className="max-w-2xl mx-auto px-4 py-10 text-gray-800">
      <Link href="/" className="text-sm text-orange-500 hover:underline mb-6 inline-block">
        ← Voltar ao cardápio
      </Link>

      <h1 className="text-3xl font-bold mb-2">Política de Privacidade</h1>
      <p className="text-sm text-gray-500 mb-8">Última atualização: {updated}</p>

      <section className="space-y-6 text-sm leading-relaxed">
        <div>
          <h2 className="font-semibold text-base mb-2">1. Controlador dos dados</h2>
          <p>
            Esta plataforma de pedidos online é operada pelo estabelecimento cujo cardápio você está acessando
            (doravante "Restaurante"). O Restaurante é o controlador dos dados pessoais coletados por meio
            deste site, nos termos da Lei nº 13.709/2018 (Lei Geral de Proteção de Dados — LGPD).
          </p>
        </div>

        <div>
          <h2 className="font-semibold text-base mb-2">2. Dados coletados e finalidade</h2>
          <p className="mb-2">Coletamos apenas os dados necessários para processar seus pedidos:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Nome e telefone</strong> — para identificação e contato sobre o pedido.</li>
            <li><strong>Endereço de entrega</strong> — exclusivamente para realizar a entrega, quando aplicável.</li>
            <li><strong>Itens do pedido</strong> — para preparação e faturamento.</li>
            <li><strong>Dados de navegação (cookies/analytics)</strong> — para melhoria da experiência e métricas
              agregadas de uso (Google Analytics / Meta Pixel), caso ativados pelo Restaurante.</li>
          </ul>
          <p className="mt-2">Não coletamos dados de cartão de crédito diretamente. Pagamentos presenciais
            são de responsabilidade do Restaurante.</p>
        </div>

        <div>
          <h2 className="font-semibold text-base mb-2">3. Base legal (LGPD)</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Execução de contrato</strong> (art. 7º, V) — dados necessários para processar e
              entregar seu pedido.</li>
            <li><strong>Legítimo interesse</strong> (art. 7º, IX) — analytics agregado para melhoria do serviço.</li>
            <li><strong>Consentimento</strong> (art. 7º, I) — cookies não essenciais, quando solicitado.</li>
          </ul>
        </div>

        <div>
          <h2 className="font-semibold text-base mb-2">4. Compartilhamento de dados</h2>
          <p>
            Seus dados poderão ser compartilhados com o entregador responsável pelo seu pedido, exclusivamente
            para fins de entrega. Não vendemos, alugamos nem compartilhamos seus dados com terceiros para
            fins de marketing sem seu consentimento explícito.
          </p>
          <p className="mt-2">
            Utilizamos serviços de infraestrutura de terceiros (Supabase para banco de dados, Vercel para
            hospedagem) que processam dados em nosso nome sob acordos de confidencialidade compatíveis com a LGPD.
          </p>
        </div>

        <div>
          <h2 className="font-semibold text-base mb-2">5. Retenção de dados</h2>
          <p>
            Dados de pedidos são retidos pelo prazo necessário ao cumprimento de obrigações legais e fiscais
            (mínimo 5 anos, conforme legislação tributária brasileira). Dados de rastreamento de pedidos
            ficam acessíveis publicamente por até 1 hora após a criação.
          </p>
        </div>

        <div>
          <h2 className="font-semibold text-base mb-2">6. Seus direitos (LGPD, art. 18)</h2>
          <p className="mb-2">Você tem direito a:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Confirmar a existência de tratamento de seus dados.</li>
            <li>Acessar os dados que possuímos sobre você.</li>
            <li>Solicitar correção de dados incompletos ou inexatos.</li>
            <li>Solicitar a exclusão de dados desnecessários ou tratados em desconformidade.</li>
            <li>Revogar o consentimento a qualquer momento.</li>
          </ul>
          <p className="mt-2">
            Para exercer esses direitos, entre em contato diretamente com o Restaurante pelo WhatsApp
            ou telefone indicado no cardápio.
          </p>
        </div>

        <div>
          <h2 className="font-semibold text-base mb-2">7. Cookies e rastreamento</h2>
          <p>
            Este site pode utilizar cookies de analytics (Google Analytics) e pixel de conversão (Meta/Facebook)
            para medir o desempenho das páginas. Esses cookies não identificam você pessoalmente e podem ser
            bloqueados nas configurações do seu navegador. O uso desses serviços está sujeito às políticas
            de privacidade do Google e da Meta, respectivamente.
          </p>
        </div>

        <div>
          <h2 className="font-semibold text-base mb-2">8. Segurança</h2>
          <p>
            Adotamos medidas técnicas e administrativas para proteger seus dados contra acessos não
            autorizados, incluindo controles de acesso por nível de linha (Row Level Security) no banco
            de dados e transmissão criptografada via HTTPS.
          </p>
        </div>

        <div>
          <h2 className="font-semibold text-base mb-2">9. Alterações nesta política</h2>
          <p>
            Podemos atualizar esta política periodicamente. Alterações relevantes serão sinalizadas
            pela data de "Última atualização" no topo desta página.
          </p>
        </div>

        <div>
          <h2 className="font-semibold text-base mb-2">10. Contato e DPO</h2>
          <p>
            Em caso de dúvidas sobre o tratamento dos seus dados, entre em contato com o Restaurante
            pelos canais indicados no cardápio. Para reclamações perante a autoridade nacional, acesse{' '}
            <a href="https://www.gov.br/anpd" target="_blank" rel="noopener noreferrer"
               className="text-orange-500 hover:underline">
              www.gov.br/anpd
            </a>.
          </p>
        </div>
      </section>
    </main>
  )
}
