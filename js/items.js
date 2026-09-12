// @ts-check
/**
 * Picture sets. Each "Guess items" game uses one set. Pages of 4 (or 2, see
 * the "Pictures at a time" setting) are cut from a set in order, so related
 * pictures are grouped in runs of 4.
 *
 * Fields:
 *   id     unique within its set; also the image file name
 *   image  path to the picture (SVG, PNG, JPG, WebP)
 *   label  text per language: shown under the picture and spoken on selection
 *   audio  optional recorded clip per language, played instead of text-to-speech
 *
 * Example with a Georgian recording:
 *   { id: 'ball', image: 'assets/images/ball.svg',
 *     label: { ka: 'ბურთი', en: 'Ball', ru: 'Мяч' },
 *     audio: { ka: 'assets/audio/ka/ball.mp3' } }
 *
 * Pictures: the mixed set and a few others are drawn for this app; the rest
 * are Twemoji (CC-BY 4.0), see README. New files must also be added to the
 * PRECACHE list in sw.js so they work offline (tests check this).
 */

/**
 * @typedef {object} Item
 * @property {string} id
 * @property {string} image
 * @property {Record<string, string>} label
 * @property {Record<string, string>} [audio]
 */

/**
 * @param {string} dir  folder under assets/images ('' for the top level)
 * @returns {(id: string, ka: string, en: string, ru: string, ext?: string) => Item}
 *   `ext` is the picture's file extension (default 'svg')
 */
const inFolder = (dir) => (id, ka, en, ru, ext = 'svg') => ({
  id,
  image: `assets/images/${dir ? dir + '/' : ''}${id}.${ext}`,
  label: { ka, en, ru },
});

/** @type {Record<string, Item[]>} */
export const itemSets = {};

{
  const item = inFolder('');
  itemSets.mixed = [
    // Page 1: fruit
    item('apple', 'ვაშლი', 'Apple', 'Яблоко'),
    item('banana', 'ბანანი', 'Banana', 'Банан'),
    item('orange', 'ფორთოხალი', 'Orange', 'Апельсин'),
    item('grapes', 'ყურძენი', 'Grapes', 'Виноград'),
    // Page 2: food
    item('strawberry', 'მარწყვი', 'Strawberry', 'Клубника'),
    item('carrot', 'სტაფილო', 'Carrot', 'Морковь'),
    item('bread', 'პური', 'Bread', 'Хлеб'),
    item('cake', 'ტორტი', 'Cake', 'Торт'),
    // Page 3: drinks and home
    item('milk', 'რძე', 'Milk', 'Молоко'),
    item('water', 'წყალი', 'Water', 'Вода'),
    item('bed', 'საწოლი', 'Bed', 'Кровать'),
    item('house', 'სახლი', 'House', 'Дом'),
    // Page 4: toys
    item('ball', 'ბურთი', 'Ball', 'Мяч'),
    item('balloon', 'ბუშტი', 'Balloon', 'Шарик'),
    item('car', 'მანქანა', 'Car', 'Машина'),
    item('book', 'წიგნი', 'Book', 'Книга'),
    // Page 5: sky and tree
    item('sun', 'მზე', 'Sun', 'Солнце'),
    item('moon', 'მთვარე', 'Moon', 'Луна'),
    item('star', 'ვარსკვლავი', 'Star', 'Звезда'),
    item('tree', 'ხე', 'Tree', 'Дерево'),
    // Page 6: flower and animals
    item('flower', 'ყვავილი', 'Flower', 'Цветок'),
    item('fish', 'თევზი', 'Fish', 'Рыба'),
    item('cat', 'კატა', 'Cat', 'Кошка'),
    item('bird', 'ჩიტი', 'Bird', 'Птица'),
  ];
}

{
  const item = inFolder('fruit');
  itemSets.fruit = [
    // Page 1
    item('apple', 'ვაშლი', 'Apple', 'Яблоко'),
    item('green-apple', 'მწვანე ვაშლი', 'Green apple', 'Зелёное яблоко'),
    item('pear', 'მსხალი', 'Pear', 'Груша'),
    item('orange', 'ფორთოხალი', 'Orange', 'Апельсин'),
    // Page 2
    item('lemon', 'ლიმონი', 'Lemon', 'Лимон'),
    item('banana', 'ბანანი', 'Banana', 'Банан'),
    item('watermelon', 'საზამთრო', 'Watermelon', 'Арбуз'),
    item('grapes', 'ყურძენი', 'Grapes', 'Виноград'),
    // Page 3
    item('strawberry', 'მარწყვი', 'Strawberry', 'Клубника'),
    item('blueberries', 'მოცვი', 'Blueberries', 'Черника'),
    item('melon', 'ნესვი', 'Melon', 'Дыня'),
    item('cherries', 'ბალი', 'Cherries', 'Черешня'),
    // Page 4
    item('peach', 'ატამი', 'Peach', 'Персик'),
    item('mango', 'მანგო', 'Mango', 'Манго'),
    item('pineapple', 'ანანასი', 'Pineapple', 'Ананас'),
    item('coconut', 'ქოქოსი', 'Coconut', 'Кокос'),
    // Page 5
    item('kiwi', 'კივი', 'Kiwi', 'Киви'),
    item('avocado', 'ავოკადო', 'Avocado', 'Авокадо'),
    item('pomegranate', 'ბროწეული', 'Pomegranate', 'Гранат'),
    item('plum', 'ქლიავი', 'Plum', 'Слива'),
    // Page 6
    item('fig', 'ლეღვი', 'Fig', 'Инжир'),
    item('apricot', 'გარგარი', 'Apricot', 'Абрикос'),
    item('quince', 'კომში', 'Quince', 'Айва'),
    item('persimmon', 'ხურმა', 'Persimmon', 'Хурма'),
  ];
}

{
  const item = inFolder('vegetables');
  itemSets.vegetables = [
    // Page 1
    item('tomato', 'პომიდორი', 'Tomato', 'Помидор'),
    item('eggplant', 'ბადრიჯანი', 'Eggplant', 'Баклажан'),
    item('potato', 'კარტოფილი', 'Potato', 'Картофель'),
    item('carrot', 'სტაფილო', 'Carrot', 'Морковь'),
    // Page 2
    item('corn', 'სიმინდი', 'Corn', 'Кукуруза'),
    item('hot-pepper', 'წიწაკა', 'Hot pepper', 'Острый перец'),
    item('bell-pepper', 'ბულგარული წიწაკა', 'Bell pepper', 'Болгарский перец'),
    item('cucumber', 'კიტრი', 'Cucumber', 'Огурец'),
    // Page 3
    item('lettuce', 'სალათა', 'Lettuce', 'Салат'),
    item('broccoli', 'ბროკოლი', 'Broccoli', 'Брокколи'),
    item('garlic', 'ნიორი', 'Garlic', 'Чеснок'),
    item('onion', 'ხახვი', 'Onion', 'Лук'),
    // Page 4
    item('mushroom', 'სოკო', 'Mushroom', 'Гриб'),
    item('peas', 'ბარდა', 'Peas', 'Горох'),
    item('beans', 'ლობიო', 'Beans', 'Фасоль'),
    item('ginger', 'ჯანჯაფილი', 'Ginger', 'Имбирь'),
    // Page 5
    item('sweet-potato', 'ბატატი', 'Sweet potato', 'Батат'),
    item('olives', 'ზეთისხილი', 'Olives', 'Оливки'),
    item('cabbage', 'კომბოსტო', 'Cabbage', 'Капуста'),
    item('pumpkin', 'გოგრა', 'Pumpkin', 'Тыква'),
    // Page 6
    item('beet', 'ჭარხალი', 'Beet', 'Свёкла'),
    item('radish', 'ბოლოკი', 'Radish', 'Редис'),
    item('zucchini', 'ყაბაყი', 'Zucchini', 'Кабачок'),
    item('cauliflower', 'ყვავილოვანი კომბოსტო', 'Cauliflower', 'Цветная капуста'),
  ];
}

{
  const item = inFolder('transport');
  itemSets.transport = [
    // Page 1
    item('car', 'მანქანა', 'Car', 'Машина'),
    item('taxi', 'ტაქსი', 'Taxi', 'Такси'),
    item('bus', 'ავტობუსი', 'Bus', 'Автобус'),
    item('minibus', 'მიკროავტობუსი', 'Minibus', 'Маршрутка'),
    // Page 2
    item('trolleybus', 'ტროლეიბუსი', 'Trolleybus', 'Троллейбус'),
    item('tram', 'ტრამვაი', 'Tram', 'Трамвай'),
    item('train', 'მატარებელი', 'Train', 'Поезд'),
    item('metro', 'მეტრო', 'Metro', 'Метро'),
    // Page 3
    item('truck', 'სატვირთო მანქანა', 'Truck', 'Грузовик'),
    item('tractor', 'ტრაქტორი', 'Tractor', 'Трактор'),
    item('motorcycle', 'მოტოციკლი', 'Motorcycle', 'Мотоцикл'),
    item('scooter', 'სკუტერი', 'Scooter', 'Скутер'),
    // Page 4
    item('bicycle', 'ველოსიპედი', 'Bicycle', 'Велосипед'),
    item('kick-scooter', 'სამოკატი', 'Kick scooter', 'Самокат'),
    item('airplane', 'თვითმფრინავი', 'Airplane', 'Самолёт'),
    item('helicopter', 'ვერტმფრენი', 'Helicopter', 'Вертолёт'),
    // Page 5
    item('rocket', 'რაკეტა', 'Rocket', 'Ракета'),
    item('ship', 'გემი', 'Ship', 'Корабль'),
    item('sailboat', 'იალქნიანი ნავი', 'Sailboat', 'Парусник'),
    item('speedboat', 'კატერი', 'Speedboat', 'Катер'),
    // Page 6
    item('ambulance', 'სასწრაფო დახმარება', 'Ambulance', 'Скорая помощь'),
    item('fire-engine', 'სახანძრო მანქანა', 'Fire engine', 'Пожарная машина'),
    item('police-car', 'პოლიციის მანქანა', 'Police car', 'Полицейская машина'),
    item('cable-car', 'საბაგირო', 'Cable car', 'Канатная дорога'),
  ];
}

{
  const item = inFolder('clothes');
  itemSets.clothes = [
    // Page 1
    item('t-shirt', 'მაისური', 'T-shirt', 'Футболка'),
    item('blouse', 'ბლუზა', 'Blouse', 'Блузка'),
    item('jeans', 'ჯინსი', 'Jeans', 'Джинсы'),
    item('shorts', 'შორტები', 'Shorts', 'Шорты'),
    // Page 2
    item('dress', 'კაბა', 'Dress', 'Платье'),
    item('coat', 'პალტო', 'Coat', 'Пальто'),
    item('scarf', 'შარფი', 'Scarf', 'Шарф'),
    item('gloves', 'ხელთათმანები', 'Gloves', 'Перчатки'),
    // Page 3
    item('socks', 'წინდები', 'Socks', 'Носки'),
    item('necktie', 'ჰალსტუხი', 'Necktie', 'Галстук'),
    item('boots', 'ჩექმები', 'Boots', 'Сапоги'),
    item('sneakers', 'ბოტასები', 'Sneakers', 'Кроссовки'),
    // Page 4
    item('shoes', 'ფეხსაცმელი', 'Shoes', 'Туфли'),
    item('high-heels', 'ქუსლიანი ფეხსაცმელი', 'High heels', 'Туфли на каблуке'),
    item('sandals', 'სანდლები', 'Sandals', 'Сандалии'),
    item('hiking-boots', 'სალაშქრო ფეხსაცმელი', 'Hiking boots', 'Ботинки'),
    // Page 5
    item('hat', 'ქუდი', 'Hat', 'Шляпа'),
    item('cap', 'კეპი', 'Cap', 'Кепка'),
    item('sun-hat', 'მზის ქუდი', 'Sun hat', 'Шляпка'),
    item('glasses', 'სათვალე', 'Glasses', 'Очки'),
    // Page 6
    item('sunglasses', 'მზის სათვალე', 'Sunglasses', 'Солнечные очки'),
    item('backpack', 'ზურგჩანთა', 'Backpack', 'Рюкзак'),
    item('handbag', 'ჩანთა', 'Handbag', 'Сумка'),
    item('umbrella', 'ქოლგა', 'Umbrella', 'Зонт'),
  ];
}

{
  const item = inFolder('animals');
  itemSets.animals = [
    // Page 1
    item('dog', 'ძაღლი', 'Dog', 'Собака'),
    item('cat', 'კატა', 'Cat', 'Кошка'),
    item('horse', 'ცხენი', 'Horse', 'Лошадь'),
    item('cow', 'ძროხა', 'Cow', 'Корова'),
    // Page 2
    item('pig', 'ღორი', 'Pig', 'Свинья'),
    item('sheep', 'ცხვარი', 'Sheep', 'Овца'),
    item('goat', 'თხა', 'Goat', 'Коза'),
    item('rabbit', 'კურდღელი', 'Rabbit', 'Кролик'),
    // Page 3
    item('mouse', 'თაგვი', 'Mouse', 'Мышь'),
    item('hedgehog', 'ზღარბი', 'Hedgehog', 'Ёж'),
    item('squirrel', 'ციყვი', 'Squirrel', 'Белка'),
    item('fox', 'მელა', 'Fox', 'Лиса'),
    // Page 4
    item('wolf', 'მგელი', 'Wolf', 'Волк'),
    item('bear', 'დათვი', 'Bear', 'Медведь'),
    item('lion', 'ლომი', 'Lion', 'Лев'),
    item('tiger', 'ვეფხვი', 'Tiger', 'Тигр'),
    // Page 5
    item('elephant', 'სპილო', 'Elephant', 'Слон'),
    item('giraffe', 'ჟირაფი', 'Giraffe', 'Жираф'),
    item('zebra', 'ზებრა', 'Zebra', 'Зебра'),
    item('monkey', 'მაიმუნი', 'Monkey', 'Обезьяна'),
    // Page 6
    item('camel', 'აქლემი', 'Camel', 'Верблюд'),
    item('deer', 'ირემი', 'Deer', 'Олень'),
    item('frog', 'ბაყაყი', 'Frog', 'Лягушка'),
    item('turtle', 'კუ', 'Turtle', 'Черепаха'),
  ];
}

{
  const item = inFolder('birds');
  itemSets.birds = [
    // Page 1
    item('sparrow', 'ბეღურა', 'Sparrow', 'Воробей', 'webp'),
    item('dove', 'მტრედი', 'Dove', 'Голубь'),
    item('eagle', 'არწივი', 'Eagle', 'Орёл'),
    item('duck', 'იხვი', 'Duck', 'Утка'),
    // Page 2
    item('swan', 'გედი', 'Swan', 'Лебедь'),
    item('owl', 'ბუ', 'Owl', 'Сова'),
    item('flamingo', 'ფლამინგო', 'Flamingo', 'Фламинго'),
    item('peacock', 'ფარშევანგი', 'Peacock', 'Павлин'),
    // Page 3
    item('parrot', 'თუთიყუში', 'Parrot', 'Попугай'),
    item('penguin', 'პინგვინი', 'Penguin', 'Пингвин'),
    item('chicken', 'ქათამი', 'Chicken', 'Курица'),
    item('rooster', 'მამალი', 'Rooster', 'Петух'),
    // Page 4
    item('chick', 'წიწილა', 'Chick', 'Цыплёнок'),
    item('turkey', 'ინდაური', 'Turkey', 'Индюк'),
    item('goose', 'ბატი', 'Goose', 'Гусь'),
    item('crow', 'ყვავი', 'Crow', 'Ворона'),
    // Page 5
    item('stork', 'ყარყატი', 'Stork', 'Аист', 'webp'),
    item('seagull', 'თოლია', 'Seagull', 'Чайка'),
    item('woodpecker', 'კოდალა', 'Woodpecker', 'Дятел', 'webp'),
    item('hummingbird', 'კოლიბრი', 'Hummingbird', 'Колибри', 'webp'),
    // Page 6
    item('ostrich', 'სირაქლემა', 'Ostrich', 'Страус'),
    item('magpie', 'კაჭკაჭი', 'Magpie', 'Сорока'),
    item('swallow', 'მერცხალი', 'Swallow', 'Ласточка'),
    item('heron', 'ყანჩა', 'Heron', 'Цапля'),
  ];
}

/**
 * An item's label in `lang`, falling back to English, then to its id.
 * @param {Item} item
 * @param {string} lang
 */
export function labelFor(item, lang) {
  return item.label[lang] ?? item.label.en ?? item.id;
}

/**
 * An item's recorded clip in `lang`, if it has one.
 * @param {Item} item
 * @param {string} lang
 */
export function clipFor(item, lang) {
  return item.audio?.[lang];
}
