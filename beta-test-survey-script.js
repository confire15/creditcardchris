// Credit Card Chris — Beta Test Survey
//
// HOW TO USE:
// 1. Go to https://script.google.com
// 2. Click "New Project"
// 3. Delete the default code and paste this entire file
// 4. Click "Run" (play button)
// 5. Authorize when prompted (it needs permission to create Forms)
// 6. Check the Execution Log for the form URL
//
// The form will appear in your Google Drive.

function createBetaTestSurvey() {
  const form = FormApp.create("Credit Card Chris — Beta Test Survey");
  form.setDescription(
    "Thanks for testing Credit Card Chris! This survey takes ~5 minutes. " +
    "Your honest feedback will directly shape the app.\n\n" +
    "App: https://creditcardchris.com"
  );
  form.setIsQuiz(false);
  form.setCollectEmail(true);
  form.setLimitOneResponsePerUser(true);
  form.setConfirmationMessage("Thanks for your feedback! 🙏");

  // ===== Section 1: About You =====
  form.addPageBreakItem().setTitle("About You");

  form.addMultipleChoiceItem()
    .setTitle("How many credit cards do you currently have?")
    .setChoiceValues(["1-2", "3-4", "5-7", "8-10", "11+"])
    .setRequired(true);

  form.addMultipleChoiceItem()
    .setTitle("How would you describe your credit card rewards knowledge?")
    .setChoiceValues([
      "Beginner — I just use whatever card is in my wallet",
      "Intermediate — I know some cards are better for certain purchases",
      "Advanced — I actively optimize which card to use per category",
      "Expert — I track multipliers, transfer partners, and statement credits"
    ])
    .setRequired(true);

  form.addMultipleChoiceItem()
    .setTitle("How do you currently decide which card to use at checkout?")
    .setChoiceValues([
      "I just use the same card for everything",
      "I try to remember which card is best but often guess",
      "I use a spreadsheet or notes app",
      "I use another app (CardPointers, MaxRewards, etc.)",
      "Other"
    ])
    .setRequired(true);

  form.addMultipleChoiceItem()
    .setTitle("What device did you primarily use to test the app?")
    .setChoiceValues(["iPhone", "Android phone", "Desktop/laptop", "iPad/tablet"])
    .setRequired(true);

  // ===== Section 2: Onboarding =====
  form.addPageBreakItem().setTitle("Onboarding & Setup");

  form.addScaleItem()
    .setTitle("How easy was it to sign up and add your first card?")
    .setBounds(1, 5)
    .setLabels("Very difficult", "Very easy")
    .setRequired(true);

  form.addMultipleChoiceItem()
    .setTitle("Were you able to find all your cards in the template library?")
    .setChoiceValues(["Yes, all of them", "Most of them", "Only some", "None of my cards were there"])
    .setRequired(true);

  form.addParagraphTextItem()
    .setTitle("Which cards were missing from the template library? (if any)")
    .setRequired(false);

  form.addScaleItem()
    .setTitle("How long did the initial setup take?")
    .setBounds(1, 5)
    .setLabels("Too long", "Just right")
    .setRequired(true);

  // ===== Section 3: Best Card Finder =====
  form.addPageBreakItem().setTitle("Best Card Finder (Home Screen)");

  form.addScaleItem()
    .setTitle("How useful is the Best Card Finder for deciding which card to use?")
    .setBounds(1, 5)
    .setLabels("Not useful at all", "Extremely useful")
    .setRequired(true);

  form.addMultipleChoiceItem()
    .setTitle("Did the Best Card Finder recommend the correct card for categories you know well?")
    .setChoiceValues(["Yes, always correct", "Mostly correct", "Sometimes wrong", "Often wrong", "I'm not sure"])
    .setRequired(true);

  form.addParagraphTextItem()
    .setTitle("Were any reward rates or card recommendations incorrect? Please describe.")
    .setRequired(false);

  form.addCheckboxItem()
    .setTitle("Which categories do you use most often? (select all that apply)")
    .setChoiceValues([
      "Dining", "Groceries", "Gas", "Travel", "Online Shopping",
      "Streaming", "Transit", "Hotels", "Flights", "Entertainment",
      "Drugstores", "Home Improvement", "Car Rental", "Other"
    ])
    .setRequired(true);

  form.addParagraphTextItem()
    .setTitle("Are there any spending categories missing that you'd want to see?")
    .setRequired(false);

  // ===== Section 4: Benefits & Credits Tracker =====
  form.addPageBreakItem().setTitle("Benefits & Credits Tracker");

  form.addScaleItem()
    .setTitle("How useful is the statement credits tracker?")
    .setBounds(1, 5)
    .setLabels("Not useful at all", "Extremely useful")
    .setRequired(true);

  form.addMultipleChoiceItem()
    .setTitle("Were your card's statement credits pre-populated correctly?")
    .setChoiceValues([
      "Yes, all correct",
      "Mostly correct, a few missing",
      "Many were missing or wrong",
      "No credits were pre-populated"
    ])
    .setRequired(true);

  form.addScaleItem()
    .setTitle("How easy was it to log credit usage?")
    .setBounds(1, 5)
    .setLabels("Very confusing", "Very easy")
    .setRequired(true);

  form.addParagraphTextItem()
    .setTitle("Any credits or benefits missing from your cards?")
    .setRequired(false);

  // ===== Section 5: Wallet =====
  form.addPageBreakItem().setTitle("Wallet & Card Management");

  form.addScaleItem()
    .setTitle("How easy was it to manage your cards in the Wallet?")
    .setBounds(1, 5)
    .setLabels("Very difficult", "Very easy")
    .setRequired(true);

  form.addMultipleChoiceItem()
    .setTitle("Did you customize any reward rates for your cards?")
    .setChoiceValues(["Yes", "No, didn't need to", "No, didn't know I could", "Tried but couldn't figure it out"])
    .setRequired(true);

  form.addParagraphTextItem()
    .setTitle("Anything confusing or frustrating about managing your wallet?")
    .setRequired(false);

  // ===== Section 6: Overall Experience =====
  form.addPageBreakItem().setTitle("Overall Experience");

  form.addScaleItem()
    .setTitle("Overall, how would you rate Credit Card Chris?")
    .setBounds(1, 5)
    .setLabels("Poor", "Excellent")
    .setRequired(true);

  form.addScaleItem()
    .setTitle("How likely are you to recommend this app to a friend? (NPS)")
    .setBounds(0, 10)
    .setLabels("Not at all likely", "Extremely likely")
    .setRequired(true);

  form.addScaleItem()
    .setTitle("How likely are you to continue using this app weekly?")
    .setBounds(1, 5)
    .setLabels("Very unlikely", "Very likely")
    .setRequired(true);

  form.addMultipleChoiceItem()
    .setTitle("Would you pay for premium features (bank sync, AI recommendations, widgets)?")
    .setChoiceValues([
      "Yes, $3.99/month sounds fair",
      "Maybe, depends on the features",
      "No, I'd only use it if it's free",
      "I'd need to see the premium features first"
    ])
    .setRequired(true);

  form.addCheckboxItem()
    .setTitle("Which future features interest you most? (select all that apply)")
    .setChoiceValues([
      "Push notifications when credits are about to expire",
      "Home screen widget showing best card",
      "Bank sync (auto-import transactions)",
      "AI-powered card recommendations",
      "Spending insights and analytics",
      "Apple Watch / Wear OS support",
      "Location-based card suggestions",
      "Card comparison tool"
    ])
    .setRequired(true);

  form.addParagraphTextItem()
    .setTitle("What's the ONE thing you'd change or add to make this app a must-have?")
    .setRequired(true);

  form.addParagraphTextItem()
    .setTitle("Any bugs, glitches, or issues you encountered?")
    .setRequired(false);

  form.addParagraphTextItem()
    .setTitle("Any other feedback or suggestions?")
    .setRequired(false);

  // Log the form URL
  Logger.log("✅ Form created successfully!");
  Logger.log("📝 Edit URL: " + form.getEditUrl());
  Logger.log("🔗 Share URL: " + form.getPublishedUrl());
}
