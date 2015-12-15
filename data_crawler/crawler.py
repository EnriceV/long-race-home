import datetime
import pprint
import random
import requests
import time

class TracksCrawler():

    def __init__(self, cartodbAPI, debug=False):
        self.cartodbAPI = cartodbAPI
        self.URL = 'https://api.findmespot.com/spot-main-web/consumer/rest-api/2.0/public/feed/{tracker_id}/message.json'
        self.DEBUG = debug
        self._get_trackers_metadata()

    def _generate_random_message(self, name):
        """
        For development purposes only. Will generate a random message that resembles one coming from the real SPOT API
        :param name: name of the tracked person
        :return: message with some random (but plausible) values
        """
        now = datetime.datetime.now()
        msg = {
            '@clientUnixTime': "0",
            'id': int(random.random() * 100000),
            'messengerId': "0-8255037",
            'messengerName': name,
            'unixTime': time.mktime(now.timetuple()),
            'messageType': "TRACK",
            'latitude': 51 + (random.random() * 10),
            'longitude': 2 + (random.random()),
            'modelId': "SPOT2",
            'showCustomMsg': "Y",
            'dateTime': now.isoformat(),
            'batteryState': "GOOD",
            'hidden': '0'
        }
        return msg

    def _generate_random_riders(self):
        self.riders = [{'full_name': 'John Doe', 'tracker_id': '494-eil4824dqe'},
            {'full_name': 'Eric Foo', 'tracker_id': '49242-dqie8473he93'}]

    def _get_trackers_metadata(self):
        """
        Fetches trackers metadata from the trackers table @ CartoDB. A CartoDB API must be set since this table is not
        public. The resulting rider names and their corresponding tracker ids are cached.
        :return: nothing
        """
        if self.DEBUG:
            self._generate_random_riders()
        else:
            sql = 'SELECT * FROM riders'
            params = {'q': sql, 'api_key':self.cartodbAPI}
            r = requests.get('https://bartaelterman.cartodb.com/api/v2/sql', params=params)
            data = r.json()['rows']
            self.riders = data


    def _fetch_messages_for_rider(self, rider):
        messages = []
        if self.DEBUG:
            for i in range(10):
                messages.append(self._generate_random_message(rider['full_name']))
        else:
            url = self.URL.format(tracker_id=rider['tracker_id'])
            print url
            r = requests.get(url)
            if r.status_code == 200:
                data = r.json()
                if u'errors' in data['response'].keys():
                    pprint.pprint(data['response']['errors'])
                else:
                    messages = data['response']['feedMessageResponse']['messages']['message']
        return messages

    def _existing_message_ids(self):
        """
        Fetch existing message_ids in the cartodb table
        :return: message_ids
        """
        if self.DEBUG:
            return [1, 2, 3]
        else:
            sql = 'SELECT message_id FROM tracks;'
            params = {'q': sql, 'api_key':self.cartodbAPI}
            r = requests.get('https://bartaelterman.cartodb.com/api/v2/sql', params=params)
            data = r.json()['rows']
            return [x['message_id'] for x in data]


    def _write_messages_to_cartodb(self, message):
        """
        Write the incoming messages to the Cartodb table.
        :param messages: list of incoming messages
        :return:
        """
        if not self.DEBUG:
            sql = """INSERT INTO tracks
                (message_id, battery_state, date_time, latitude, longitude, rider_full_name, the_geom)
                VALUES ({0}, '{1}', '{2}', {3}, {4}, '{5}', ST_SetSRID(ST_Point({4}, {3}),4326))""".format(
                message['id'], message['batteryState'], message['dateTime'], message['latitude'],
                       message['longitude'], message['rider_name'])
            print sql
            params = {'q': sql, 'api_key':self.cartodbAPI}
            r = requests.get('https://bartaelterman.cartodb.com/api/v2/sql', params=params)
            print('API_RESPONSE: {0}: {1}: {2}'.format(message['rider_name'], r.status_code, r.text))


    def fetch_new_messages(self):
        existing_messages = self._existing_message_ids()
        messages_to_write = []
        for rider in self.riders:
            messages = self._fetch_messages_for_rider(rider)
            for message in messages:
                if str(message['id']) not in existing_messages:
                    message['rider_name'] = rider['full_name']
                    messages_to_write.append(message)
                    self._write_messages_to_cartodb(message)
        if self.DEBUG:
            return messages_to_write

if __name__ == '__main__':
    crawler = TracksCrawler('a72c682f541f69035c0698dacd029d3d19409aa6', debug=False)
    msgs = crawler.fetch_new_messages()
    pprint.pprint(msgs)