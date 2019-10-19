const textToSpeech = require('@google-cloud/text-to-speech')
const fs = require('fs')
const util = require('util')

module.exports = async text => {
  try {
    const client = new textToSpeech.TextToSpeechClient()
    const request = {
      input: { text },
      voice: { languageCode: 'ru-RU', name: 'ru-RU-Wavenet-B' },
      audioConfig: { audioEncoding: 'MP3', pitch: 0, speakingRate: 1 }
    }
    const [response] = await client.synthesizeSpeech(request)
    const writeFile = util.promisify(fs.writeFile)
    const fileName = `${Date.now()}.mp3`
    await writeFile(
      `${__dirname}/../../uploads/${fileName}`,
      response.audioContent,
      'binary'
    )
    return fileName
  } catch (err) {
    console.log(err)
    return null
  }
}
