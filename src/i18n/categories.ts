import { Language } from '@/i18n/types';

const categoryTranslations: Record<string, Record<Language, string>> = {
  'Plumbing': { en: 'Plumbing', 'pt-BR': 'Encanamento', fr: 'Plomberie' },
  'Electrical': { en: 'Electrical', 'pt-BR': 'Elétrica', fr: 'Électricité' },
  'Cleaning': { en: 'Cleaning', 'pt-BR': 'Limpeza', fr: 'Nettoyage' },
  'Tutoring': { en: 'Tutoring', 'pt-BR': 'Reforço escolar', fr: 'Soutien scolaire' },
  'Photography': { en: 'Photography', 'pt-BR': 'Fotografia', fr: 'Photographie' },
  'Legal Services': { en: 'Legal Services', 'pt-BR': 'Serviços jurídicos', fr: 'Services juridiques' },
  'Beauty & Wellness': { en: 'Beauty & Wellness', 'pt-BR': 'Beleza e bem-estar', fr: 'Beauté et bien-être' },
  'IT & Tech Support': { en: 'IT & Tech Support', 'pt-BR': 'Suporte de TI', fr: 'Support informatique' },
  'Event Planning': { en: 'Event Planning', 'pt-BR': 'Organização de eventos', fr: "Organisation d'événements" },
  'Landscaping': { en: 'Landscaping', 'pt-BR': 'Paisagismo', fr: 'Paysagisme' },
  'Accounting': { en: 'Accounting', 'pt-BR': 'Contabilidade', fr: 'Comptabilité' },
  'Home Repair': { en: 'Home Repair', 'pt-BR': 'Reparos domésticos', fr: 'Réparation maison' },
  'Healthcare': { en: 'Healthcare', 'pt-BR': 'Saúde', fr: 'Santé' },
  'Fitness & Personal Training': { en: 'Fitness & Personal Training', 'pt-BR': 'Fitness e personal training', fr: 'Fitness et coaching personnel' },
  'Catering': { en: 'Catering', 'pt-BR': 'Buffet', fr: 'Traiteur' },
  'Moving Services': { en: 'Moving Services', 'pt-BR': 'Mudanças', fr: 'Déménagement' },
  'Auto Repair': { en: 'Auto Repair', 'pt-BR': 'Mecânica automotiva', fr: 'Réparation auto' },
  'Pet Services': { en: 'Pet Services', 'pt-BR': 'Serviços para pets', fr: 'Services pour animaux' },
  'Childcare': { en: 'Childcare', 'pt-BR': 'Cuidado infantil', fr: "Garde d'enfants" },
  'Interior Design': { en: 'Interior Design', 'pt-BR': 'Design de interiores', fr: 'Design intérieur' },
  'Roofing': { en: 'Roofing', 'pt-BR': 'Telhados', fr: 'Toiture' },
  'Painting': { en: 'Painting', 'pt-BR': 'Pintura', fr: 'Peinture' },
  'Pest Control': { en: 'Pest Control', 'pt-BR': 'Controle de pragas', fr: 'Dératisation' },
  'HVAC': { en: 'HVAC', 'pt-BR': 'Climatização', fr: 'Climatisation' },
  'Carpentry': { en: 'Carpentry', 'pt-BR': 'Carpintaria', fr: 'Menuiserie' },
  'Masonry': { en: 'Masonry', 'pt-BR': 'Alvenaria', fr: 'Maçonnerie' },
  'Security Services': { en: 'Security Services', 'pt-BR': 'Serviços de segurança', fr: 'Services de sécurité' },
  'Marketing & Advertising': { en: 'Marketing & Advertising', 'pt-BR': 'Marketing e publicidade', fr: 'Marketing et publicité' },
  'Web Development': { en: 'Web Development', 'pt-BR': 'Desenvolvimento web', fr: 'Développement web' },
  'Graphic Design': { en: 'Graphic Design', 'pt-BR': 'Design gráfico', fr: 'Design graphique' },
  'Writing & Translation': { en: 'Writing & Translation', 'pt-BR': 'Redação e tradução', fr: 'Rédaction et traduction' },
  'Consulting': { en: 'Consulting', 'pt-BR': 'Consultoria', fr: 'Conseil' },
  'Real Estate': { en: 'Real Estate', 'pt-BR': 'Imobiliária', fr: 'Immobilier' },
  'Insurance': { en: 'Insurance', 'pt-BR': 'Seguros', fr: 'Assurance' },
  'Financial Planning': { en: 'Financial Planning', 'pt-BR': 'Planejamento financeiro', fr: 'Planification financière' },
  'Tax Services': { en: 'Tax Services', 'pt-BR': 'Serviços tributários', fr: 'Services fiscaux' },
  'Architecture': { en: 'Architecture', 'pt-BR': 'Arquitetura', fr: 'Architecture' },
  'Surveying': { en: 'Surveying', 'pt-BR': 'Agrimensura', fr: 'Arpentage' },
  'Waste Removal': { en: 'Waste Removal', 'pt-BR': 'Coleta de lixo', fr: 'Enlèvement des déchets' },
  'Pool Maintenance': { en: 'Pool Maintenance', 'pt-BR': 'Manutenção de piscina', fr: 'Entretien de piscine' },
  'Appliance Repair': { en: 'Appliance Repair', 'pt-BR': 'Reparo de eletrodomésticos', fr: 'Réparation électroménager' },
  'Locksmith': { en: 'Locksmith', 'pt-BR': 'Chaveiro', fr: 'Serrurerie' },
  'Tree Services': { en: 'Tree Services', 'pt-BR': 'Serviços de árvores', fr: 'Services arboricoles' },
  'Solar Installation': { en: 'Solar Installation', 'pt-BR': 'Instalação solar', fr: 'Installation solaire' },
  'Flooring': { en: 'Flooring', 'pt-BR': 'Pisos', fr: 'Revêtement de sol' },
  'Window & Doors': { en: 'Window & Doors', 'pt-BR': 'Janelas e portas', fr: 'Fenêtres et portes' },
  'Fencing': { en: 'Fencing', 'pt-BR': 'Cercas', fr: 'Clôtures' },
  'Gardening': { en: 'Gardening', 'pt-BR': 'Jardinagem', fr: 'Jardinage' },
  'Music Lessons': { en: 'Music Lessons', 'pt-BR': 'Aulas de música', fr: 'Cours de musique' },
  'Art Classes': { en: 'Art Classes', 'pt-BR': 'Aulas de arte', fr: "Cours d'art" },
  'Cooking Classes': { en: 'Cooking Classes', 'pt-BR': 'Aulas de culinária', fr: 'Cours de cuisine' },
  'Driving Lessons': { en: 'Driving Lessons', 'pt-BR': 'Aulas de direção', fr: 'Leçons de conduite' },
  'Tailoring & Alterations': { en: 'Tailoring & Alterations', 'pt-BR': 'Alfaiataria e reformas', fr: 'Couture et retouches' },
  'Dry Cleaning': { en: 'Dry Cleaning', 'pt-BR': 'Lavanderia', fr: 'Nettoyage à sec' },
  'Veterinary': { en: 'Veterinary', 'pt-BR': 'Veterinária', fr: 'Vétérinaire' },
  'Optometry': { en: 'Optometry', 'pt-BR': 'Optometria', fr: 'Optométrie' },
  'Dental': { en: 'Dental', 'pt-BR': 'Odontologia', fr: 'Dentaire' },
  'Pharmacy': { en: 'Pharmacy', 'pt-BR': 'Farmácia', fr: 'Pharmacie' },
  'Physiotherapy': { en: 'Physiotherapy', 'pt-BR': 'Fisioterapia', fr: 'Physiothérapie' },
  'Nutritionist': { en: 'Nutritionist', 'pt-BR': 'Nutricionista', fr: 'Nutritionniste' },
};

export function translateCategory(name: string, lang: Language): string {
  return categoryTranslations[name]?.[lang] ?? name;
}

const reverseMap: Map<string, string> = (() => {
  const m = new Map<string, string>();
  for (const [canonical, translations] of Object.entries(categoryTranslations)) {
    m.set(canonical.toLowerCase(), canonical);
    for (const translated of Object.values(translations)) {
      m.set(translated.toLowerCase(), canonical);
    }
  }
  return m;
})();

export function resolveCanonicalCategory(query: string): string | null {
  const q = query.trim().toLowerCase();
  if (!q) return null;
  if (reverseMap.has(q)) return reverseMap.get(q)!;
  for (const [key, canonical] of reverseMap) {
    if (key.includes(q) || q.includes(key)) return canonical;
  }
  return null;
}
