export type Language = 'en' | 'pt-BR' | 'fr';

export interface TranslationKey {
  // Navbar
  'nav.browse': string;
  'nav.messages': string;
  'nav.dashboard': string;
  'nav.adminPanel': string;
  'nav.login': string;
  'nav.signup': string;
  'nav.signout': string;

  // Language switcher
  'lang.label': string;

  // Hero
  'hero.badge': string;
  'hero.title': string;
  'hero.subtitle': string;
  'hero.searchPlaceholder': string;
  'hero.locationPlaceholder': string;
  'hero.categories': string;
  'hero.verified': string;
  'hero.verifiedProviders': string;
  'hero.realRatings': string;
  'hero.realRatingsDesc': string;

  // Categories section
  'categories.title': string;
  'categories.subtitle': string;
  'categories.findProviders': string;

  // How it works
  'how.title': string;
  'how.subtitle': string;
  'how.stepLabel': string;
  'how.step1': string;
  'how.step1Desc': string;
  'how.step2': string;
  'how.step2Desc': string;
  'how.step3': string;
  'how.step3Desc': string;

  // Search results
  'search.providersFound': string;
  'search.providerFound': string;
  'search.filtersActive': string;
  'search.filterActive': string;
  'search.browseProviders': string;
  'search.showingAll': string;
  'search.clearFilters': string;
  'search.filters': string;
  'search.searchPlaceholder': string;
  'search.locationPlaceholder': string;
  'search.category': string;
  'search.allCategories': string;
  'search.serviceName': string;
  'search.servicePlaceholder': string;
  'search.languages': string;
  'search.languagesPlaceholder': string;
  'search.minRating': string;
  'search.minRatingAny': string;
  'search.noResults': string;
  'search.adjustFilters': string;
  'search.clearAll': string;
  'search.searchBtn': string;
  'search.resultsTitle': string;
  'search.resultsSubtitle': string;
  'search.backHome': string;
  'search.noResultsTitle': string;
  'search.noResultsDesc': string;
  'search.browseAll': string;

  // CTA
  'cta.title': string;
  'cta.subtitle': string;
  'cta.button': string;

  // Auth
  'auth.createAccount': string;
  'auth.joinSubtitle': string;
  'auth.consumer': string;
  'auth.provider': string;
  'auth.yourName': string;
  'auth.companyName': string;
  'auth.email': string;
  'auth.password': string;
  'auth.passwordPlaceholder': string;
  'auth.createAccountBtn': string;
  'auth.alreadyHaveAccount': string;
  'auth.loginLink': string;
  'auth.welcomeBack': string;
  'auth.loginSubtitle': string;
  'auth.loginBtn': string;
  'auth.newToTrusthub': string;
  'auth.incorrectCredentials': string;
  'auth.signinFailed': string;
  'auth.signupFailed': string;
  'auth.emailRegistered': string;

  // Provider detail
  'provider.backToBrowse': string;
  'provider.unnamed': string;
  'provider.noRatings': string;
  'provider.website': string;
  'provider.messageProvider': string;
  'provider.services': string;
  'provider.noServices': string;
  'provider.uncategorized': string;
  'provider.inquire': string;
  'provider.reviews': string;
  'provider.noReviews': string;
  'provider.notFound': string;
  'provider.anonymous': string;

  // Consumer dashboard
  'consumer.dashboard': string;
  'consumer.profile': string;
  'consumer.messages': string;
  'consumer.ratings': string;
  'consumer.yourName': string;
  'consumer.city': string;
  'consumer.state': string;
  'consumer.country': string;
  'consumer.preferredLanguages': string;
  'consumer.langPlaceholder': string;
  'consumer.saveProfile': string;
  'consumer.saved': string;
  'consumer.startConversation': string;
  'consumer.yourRating': string;
  'consumer.reviewPlaceholder': string;
  'consumer.submitRating': string;
  'consumer.submitting': string;
  'consumer.conversationStarted': string;

  // Provider dashboard
  'providerDashboard.title': string;
  'providerDashboard.profile': string;
  'providerDashboard.services': string;
  'providerDashboard.messages': string;
  'providerDashboard.ratings': string;
  'providerDashboard.alias': string;
  'providerDashboard.website': string;
  'providerDashboard.phone': string;
  'providerDashboard.socialLinks': string;
  'providerDashboard.platform': string;
  'providerDashboard.addLink': string;
  'providerDashboard.address': string;
  'providerDashboard.languagesOffered': string;
  'providerDashboard.saveProfile': string;
  'providerDashboard.saved': string;
  'providerDashboard.uploadLogo': string;
  'providerDashboard.addService': string;
  'providerDashboard.serviceName': string;
  'providerDashboard.selectCategory': string;
  'providerDashboard.description': string;
  'providerDashboard.price': string;
  'providerDashboard.priceOptional': string;
  'providerDashboard.addServiceBtn': string;
  'providerDashboard.noServices': string;
  'providerDashboard.noRatings': string;
  'providerDashboard.approve': string;
  'providerDashboard.deny': string;
  'providerDashboard.denyDesc': string;
  'providerDashboard.disputed': string;
  'providerDashboard.disputedDesc': string;
  'providerDashboard.pending': string;

  // Messaging
  'msg.conversations': string;
  'msg.noMessages': string;
  'msg.noMessagesConsumer': string;
  'msg.noMessagesProvider': string;
  'msg.noMessagesYet': string;
  'msg.selectConversation': string;
  'msg.typeMessage': string;
  'msg.today': string;
  'msg.yesterday': string;
  'msg.provider': string;
  'msg.consumer': string;
  'msg.searchPlaceholder': string;
  'msg.searchByNameOrContent': string;
  'msg.allConversations': string;
  'msg.thisChat': string;
  'msg.currentChat': string;
  'msg.clear': string;
  'msg.results': string;
  'msg.result': string;
  'msg.noResults': string;
  'msg.noResultsDesc': string;
  'msg.enterSearch': string;
  'msg.you': string;
  'msg.sortBy': string;
  'msg.sortNameAsc': string;
  'msg.sortNameDesc': string;
  'msg.sortDateNewest': string;
  'msg.sortDateOldest': string;

  // Admin
  'admin.title': string;
  'admin.users': string;
  'admin.providers': string;
  'admin.categories': string;
  'admin.services': string;
  'admin.disputes': string;
  'admin.email': string;
  'admin.role': string;
  'admin.status': string;
  'admin.actions': string;
  'admin.suspended': string;
  'admin.active': string;
  'admin.suspend': string;
  'admin.unsuspend': string;
  'admin.delete': string;
  'admin.deleteConfirm': string;
  'admin.deleteFailed': string;
  'admin.newCategory': string;
  'admin.categoryPlaceholder': string;
  'admin.add': string;
  'admin.noServices': string;
  'admin.by': string;
  'admin.noDisputes': string;
  'admin.approve': string;
  'admin.reject': string;
  'admin.rated': string;
  'admin.cannotDeleteSelf': string;
  'admin.gateTitle': string;
  'admin.gateSubtitle': string;
  'admin.gatePassword': string;
  'admin.gateEnter': string;
  'admin.gateError': string;
  'admin.gateVerifying': string;

  // Common
  'common.loading': string;
  'common.cancel': string;
  'common.save': string;
  'common.delete': string;
  'common.unknown': string;
  'common.city': string;
  'common.state': string;
  'common.country': string;
  'common.selectValid': string;
  'common.uncategorized': string;
  'common.languages': string;
  'common.anonymous': string;
}

export const LANGUAGES: { code: Language; label: string; flag: string }[] = [
  { code: 'en', label: 'English', flag: 'EN' },
  { code: 'pt-BR', label: 'Português (BR)', flag: 'PT' },
  { code: 'fr', label: 'Français', flag: 'FR' },
];
