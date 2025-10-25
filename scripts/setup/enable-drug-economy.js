// Quick script to enable drug economy in browser console
// Copy and paste this entire block into your browser console while the app is running

(function() {
  console.log('🔧 Enabling Drug Economy System...');
  
  // Get current experimental settings
  const settings = JSON.parse(localStorage.getItem('experimental_settings') || '{}');
  
  if (!settings.gangsConfig) {
    console.error('❌ Gang mode not configured. Please enable gangs first.');
    return;
  }
  
  // Enable drug economy
  settings.gangsConfig.drugEconomyEnabled = true;
  
  // Set frequencies for good activity (adjust as needed)
  settings.gangsConfig.drugSmugglingFrequency = 0.5;  // 5% per cycle - moderate
  settings.gangsConfig.drugDealingFrequency = 0.6;    // 9% per cycle - frequent
  settings.gangsConfig.drugDetectionRisk = 0.12;      // 12% base risk - balanced
  settings.gangsConfig.itemStealingEnabled = true;
  
  // Initialize drug economy fields for existing gangs (backward compatibility)
  if (settings.gangsConfig.gangs) {
    Object.values(settings.gangsConfig.gangs).forEach(gang => {
      if (gang.money === undefined) gang.money = 0;
      if (gang.totalEarnings === undefined) gang.totalEarnings = 0;
      if (gang.items === undefined) gang.items = [];
      if (gang.drugsStash === undefined) gang.drugsStash = 0;
      
      // Optional: Give each gang some starting money for testing
      // gang.money = 200;
    });
  }
  
  // Initialize drug economy fields for existing members
  if (settings.gangsConfig.memberStatus) {
    Object.values(settings.gangsConfig.memberStatus).forEach(status => {
      if (status.drugsCarrying === undefined) status.drugsCarrying = 0;
      if (status.drugsDealt === undefined) status.drugsDealt = 0;
      if (status.drugsSmuggled === undefined) status.drugsSmuggled = 0;
      if (status.drugsCaught === undefined) status.drugsCaught = 0;
      if (status.sentenceExtensions === undefined) status.sentenceExtensions = 0;
    });
  }
  
  // Save settings
  localStorage.setItem('experimental_settings', JSON.stringify(settings));
  
  console.log('✅ Drug Economy Enabled!');
  console.log('📊 Settings:');
  console.log('  - Smuggling Frequency:', settings.gangsConfig.drugSmugglingFrequency);
  console.log('  - Dealing Frequency:', settings.gangsConfig.drugDealingFrequency);
  console.log('  - Detection Risk:', settings.gangsConfig.drugDetectionRisk);
  console.log('  - Item Stealing:', settings.gangsConfig.itemStealingEnabled);
  console.log('\n🔄 Reload the page to apply changes!');
  console.log('📈 Watch the Gang Debug Window → Gangs tab for money stats');
  console.log('💰 Gang leaders will show $ totals in the personality panel');
})();

