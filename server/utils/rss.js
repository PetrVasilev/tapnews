const Parser = require('rss-parser')
const htmlToJson = require('html-to-json')
const _cliProgress = require('cli-progress')
const fs = require('fs')

const speechToText = require('./speech')
const News = require('../models/News')

module.exports = async () => {
  const news = await News.find()
  if (news.length > 0) return

  const parser = new Parser()
  const [ysia, lenta, vcru] = await Promise.all([
    parser.parseURL('http://ysia.ru/feed/'),
    parser.parseURL('https://lenta.ru/rss/last24'),
    parser.parseURL('https://vc.ru/rss')
  ])

  const data = [...ysia.items, ...lenta.items, ...vcru.items]
  const parsingLoading = new _cliProgress.SingleBar(
    {},
    _cliProgress.Presets.shades_classic
  )
  console.log('Parsing RSS - Lenta, YSIA, VC RU')
  parsingLoading.start(data.length, 0)

  const promises = await data.map(async item => {
    const result = await htmlToJson.request(item.link, {
      images: [
        'img',
        function($img) {
          if ($img.hasClass('entry-thumb')) {
            return $img.attr('src')
          }
          if ($img.hasClass('g-picture')) {
            return $img.attr('src')
          }
          return null
        }
      ],
      contentArr: [
        'p',
        function($p) {
          if ($p.parents('.comments').length > 0) {
            return null
          }
          if ($p.parents('.live').length > 0) {
            return null
          }
          if ($p.parents('.island').length > 0) {
            return null
          }
          if ($p.hasClass('comments__item__user__name')) {
            return null
          }
          if ($p.hasClass('live_head__title')) {
            return null
          }
          return $p.text()
        }
      ]
    })
    const sourceURL = new URL(item.link)
    const content = result.contentArr
      .filter(a => a)
      .join('\n')
      .replace(/ +(?= )/g, '')
      .substring(0, 4000)
    const _image = result.images.filter(a => a)[0]
    const doc = {
      title: item.title,
      created: item.isoDate,
      source: sourceURL.hostname,
      url: item.link,
      image: _image ? _image : item.enclosure ? item.enclosure.url : null,
      content
    }
    parsingLoading.increment()
    return doc
  })

  const arr = await Promise.all(promises)
  parsingLoading.stop()
  console.log('Parsing finished :)')
  saveToDB(arr)
}

async function saveToDB(array) {
  const saveLoading = new _cliProgress.SingleBar(
    {},
    _cliProgress.Presets.shades_classic
  )
  console.log('Starting save news to DB')
  saveLoading.start(array.length, 0)

  const news = await News.find()
  const deleting = news.map(async n => {
    if (n.audio) {
      const path = __dirname + `/../../uploads/${n.audio}`
      fs.unlink(path, () => {})
    }
    return n.remove()
  })
  await Promise.all(deleting)

  for (let item of array) {
    const audio = await speechToText(item.title + '. ' + item.content)
    const news = new News({
      ...item,
      audio
    })
    await news.save()
    saveLoading.increment()
  }

  console.log('\nSaving to DB finished :)')
  saveLoading.stop()
}
