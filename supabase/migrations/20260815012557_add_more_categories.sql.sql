/*
# Add many more service categories

## Plain-English summary
Expands the category list from 12 to 40+ categories covering a wide range
of services consumers might search for. Existing categories are kept; new
ones are inserted with ON CONFLICT DO NOTHING so the migration is safe to
re-run.

## New categories
Healthcare, Fitness & Personal Training, Catering, Moving Services, Auto
Repair, Pet Services, Childcare, Interior Design, Roofing, Painting,
Pest Control, HVAC, Carpentry, Masonry, Security Services, Marketing &
Advertising, Web Development, Graphic Design, Writing & Translation,
Consulting, Real Estate, Insurance, Financial Planning, Tax Services,
Architecture, Surveying, Waste Removal, Pool Maintenance, Appliance
Repair, Locksmith, Tree Services, Solar Installation, Flooring,
Window & Doors, Fencing, Gardening, Music Lessons, Art Classes, Cooking
Classes, Driving Lessons, Tailoring & Alterations, Dry Cleaning,
Veterinary, Optometry, Dental, Pharmacy, Physiotherapy, Nutritionist.
*/

INSERT INTO categories (name)
VALUES
  ('Healthcare'),
  ('Fitness & Personal Training'),
  ('Catering'),
  ('Moving Services'),
  ('Auto Repair'),
  ('Pet Services'),
  ('Childcare'),
  ('Interior Design'),
  ('Roofing'),
  ('Painting'),
  ('Pest Control'),
  ('HVAC'),
  ('Carpentry'),
  ('Masonry'),
  ('Security Services'),
  ('Marketing & Advertising'),
  ('Web Development'),
  ('Graphic Design'),
  ('Writing & Translation'),
  ('Consulting'),
  ('Real Estate'),
  ('Insurance'),
  ('Financial Planning'),
  ('Tax Services'),
  ('Architecture'),
  ('Surveying'),
  ('Waste Removal'),
  ('Pool Maintenance'),
  ('Appliance Repair'),
  ('Locksmith'),
  ('Tree Services'),
  ('Solar Installation'),
  ('Flooring'),
  ('Window & Doors'),
  ('Fencing'),
  ('Gardening'),
  ('Music Lessons'),
  ('Art Classes'),
  ('Cooking Classes'),
  ('Driving Lessons'),
  ('Tailoring & Alterations'),
  ('Dry Cleaning'),
  ('Veterinary'),
  ('Optometry'),
  ('Dental'),
  ('Pharmacy'),
  ('Physiotherapy'),
  ('Nutritionist')
ON CONFLICT (name) DO NOTHING;
