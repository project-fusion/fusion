export function Example() {
  return (
    <helix-flex direction="column" gap="md">
      <span className="label">Small, 0.5rem</span>
      <helix-heatmap
        className="small"
        for="sizesmall"
        label="Commits, small cells"
        rows={5}
        thresholds="1 3 5 7 9"
        tones="1 2 3 4 5"
      >
        <table data-hidden-visually id="sizesmall">
          <caption>Commits</caption>
          <tbody>
            <tr>
              <th scope="row">Day 1</th>
              <td data-value="0">0</td>
            </tr>
            <tr>
              <th scope="row">Day 2</th>
              <td data-value="3">3</td>
            </tr>
            <tr>
              <th scope="row">Day 3</th>
              <td data-value="7">7</td>
            </tr>
            <tr>
              <th scope="row">Day 4</th>
              <td data-value="2">2</td>
            </tr>
            <tr>
              <th scope="row">Day 5</th>
              <td data-value="9">9</td>
            </tr>
            <tr>
              <th scope="row">Day 6</th>
              <td data-value="4">4</td>
            </tr>
            <tr>
              <th scope="row">Day 7</th>
              <td data-value="1">1</td>
            </tr>
            <tr>
              <th scope="row">Day 8</th>
              <td data-value="6">6</td>
            </tr>
            <tr>
              <th scope="row">Day 9</th>
              <td data-value="10">10</td>
            </tr>
            <tr>
              <th scope="row">Day 10</th>
              <td data-value="5">5</td>
            </tr>
            <tr>
              <th scope="row">Day 11</th>
              <td data-value="8">8</td>
            </tr>
            <tr>
              <th scope="row">Day 12</th>
              <td data-value="2">2</td>
            </tr>
            <tr>
              <th scope="row">Day 13</th>
              <td data-value="4">4</td>
            </tr>
            <tr>
              <th scope="row">Day 14</th>
              <td data-value="7">7</td>
            </tr>
            <tr>
              <th scope="row">Day 15</th>
              <td data-value="3">3</td>
            </tr>
            <tr>
              <th scope="row">Day 16</th>
              <td data-value="9">9</td>
            </tr>
            <tr>
              <th scope="row">Day 17</th>
              <td data-value="1">1</td>
            </tr>
            <tr>
              <th scope="row">Day 18</th>
              <td data-value="5">5</td>
            </tr>
            <tr>
              <th scope="row">Day 19</th>
              <td data-value="8">8</td>
            </tr>
            <tr>
              <th scope="row">Day 20</th>
              <td data-value="6">6</td>
            </tr>
            <tr>
              <th scope="row">Day 21</th>
              <td data-value="2">2</td>
            </tr>
            <tr>
              <th scope="row">Day 22</th>
              <td data-value="4">4</td>
            </tr>
            <tr>
              <th scope="row">Day 23</th>
              <td data-value="9">9</td>
            </tr>
            <tr>
              <th scope="row">Day 24</th>
              <td data-value="7">7</td>
            </tr>
            <tr>
              <th scope="row">Day 25</th>
              <td data-value="3">3</td>
            </tr>
            <tr>
              <th scope="row">Day 26</th>
              <td data-value="1">1</td>
            </tr>
            <tr>
              <th scope="row">Day 27</th>
              <td data-value="6">6</td>
            </tr>
            <tr>
              <th scope="row">Day 28</th>
              <td data-value="10">10</td>
            </tr>
            <tr>
              <th scope="row">Day 29</th>
              <td data-value="5">5</td>
            </tr>
            <tr>
              <th scope="row">Day 30</th>
              <td data-value="2">2</td>
            </tr>
          </tbody>
        </table>
      </helix-heatmap>

      <span className="label">Medium, 0.875rem</span>
      <helix-heatmap
        className="medium"
        for="sizemedium"
        label="Commits, medium cells"
        rows={5}
        thresholds="1 3 5 7 9"
        tones="1 2 3 4 5"
      >
        <table data-hidden-visually id="sizemedium">
          <caption>Commits</caption>
          <tbody>
            <tr>
              <th scope="row">Day 1</th>
              <td data-value="0">0</td>
            </tr>
            <tr>
              <th scope="row">Day 2</th>
              <td data-value="3">3</td>
            </tr>
            <tr>
              <th scope="row">Day 3</th>
              <td data-value="7">7</td>
            </tr>
            <tr>
              <th scope="row">Day 4</th>
              <td data-value="2">2</td>
            </tr>
            <tr>
              <th scope="row">Day 5</th>
              <td data-value="9">9</td>
            </tr>
            <tr>
              <th scope="row">Day 6</th>
              <td data-value="4">4</td>
            </tr>
            <tr>
              <th scope="row">Day 7</th>
              <td data-value="1">1</td>
            </tr>
            <tr>
              <th scope="row">Day 8</th>
              <td data-value="6">6</td>
            </tr>
            <tr>
              <th scope="row">Day 9</th>
              <td data-value="10">10</td>
            </tr>
            <tr>
              <th scope="row">Day 10</th>
              <td data-value="5">5</td>
            </tr>
            <tr>
              <th scope="row">Day 11</th>
              <td data-value="8">8</td>
            </tr>
            <tr>
              <th scope="row">Day 12</th>
              <td data-value="2">2</td>
            </tr>
            <tr>
              <th scope="row">Day 13</th>
              <td data-value="4">4</td>
            </tr>
            <tr>
              <th scope="row">Day 14</th>
              <td data-value="7">7</td>
            </tr>
            <tr>
              <th scope="row">Day 15</th>
              <td data-value="3">3</td>
            </tr>
            <tr>
              <th scope="row">Day 16</th>
              <td data-value="9">9</td>
            </tr>
            <tr>
              <th scope="row">Day 17</th>
              <td data-value="1">1</td>
            </tr>
            <tr>
              <th scope="row">Day 18</th>
              <td data-value="5">5</td>
            </tr>
            <tr>
              <th scope="row">Day 19</th>
              <td data-value="8">8</td>
            </tr>
            <tr>
              <th scope="row">Day 20</th>
              <td data-value="6">6</td>
            </tr>
            <tr>
              <th scope="row">Day 21</th>
              <td data-value="2">2</td>
            </tr>
            <tr>
              <th scope="row">Day 22</th>
              <td data-value="4">4</td>
            </tr>
            <tr>
              <th scope="row">Day 23</th>
              <td data-value="9">9</td>
            </tr>
            <tr>
              <th scope="row">Day 24</th>
              <td data-value="7">7</td>
            </tr>
            <tr>
              <th scope="row">Day 25</th>
              <td data-value="3">3</td>
            </tr>
            <tr>
              <th scope="row">Day 26</th>
              <td data-value="1">1</td>
            </tr>
            <tr>
              <th scope="row">Day 27</th>
              <td data-value="6">6</td>
            </tr>
            <tr>
              <th scope="row">Day 28</th>
              <td data-value="10">10</td>
            </tr>
            <tr>
              <th scope="row">Day 29</th>
              <td data-value="5">5</td>
            </tr>
            <tr>
              <th scope="row">Day 30</th>
              <td data-value="2">2</td>
            </tr>
          </tbody>
        </table>
      </helix-heatmap>

      <span className="label">Large, 1.25rem</span>
      <helix-heatmap
        className="large"
        for="sizelarge"
        label="Commits, large cells"
        rows={5}
        thresholds="1 3 5 7 9"
        tones="1 2 3 4 5"
      >
        <table data-hidden-visually id="sizelarge">
          <caption>Commits</caption>
          <tbody>
            <tr>
              <th scope="row">Day 1</th>
              <td data-value="0">0</td>
            </tr>
            <tr>
              <th scope="row">Day 2</th>
              <td data-value="3">3</td>
            </tr>
            <tr>
              <th scope="row">Day 3</th>
              <td data-value="7">7</td>
            </tr>
            <tr>
              <th scope="row">Day 4</th>
              <td data-value="2">2</td>
            </tr>
            <tr>
              <th scope="row">Day 5</th>
              <td data-value="9">9</td>
            </tr>
            <tr>
              <th scope="row">Day 6</th>
              <td data-value="4">4</td>
            </tr>
            <tr>
              <th scope="row">Day 7</th>
              <td data-value="1">1</td>
            </tr>
            <tr>
              <th scope="row">Day 8</th>
              <td data-value="6">6</td>
            </tr>
            <tr>
              <th scope="row">Day 9</th>
              <td data-value="10">10</td>
            </tr>
            <tr>
              <th scope="row">Day 10</th>
              <td data-value="5">5</td>
            </tr>
            <tr>
              <th scope="row">Day 11</th>
              <td data-value="8">8</td>
            </tr>
            <tr>
              <th scope="row">Day 12</th>
              <td data-value="2">2</td>
            </tr>
            <tr>
              <th scope="row">Day 13</th>
              <td data-value="4">4</td>
            </tr>
            <tr>
              <th scope="row">Day 14</th>
              <td data-value="7">7</td>
            </tr>
            <tr>
              <th scope="row">Day 15</th>
              <td data-value="3">3</td>
            </tr>
            <tr>
              <th scope="row">Day 16</th>
              <td data-value="9">9</td>
            </tr>
            <tr>
              <th scope="row">Day 17</th>
              <td data-value="1">1</td>
            </tr>
            <tr>
              <th scope="row">Day 18</th>
              <td data-value="5">5</td>
            </tr>
            <tr>
              <th scope="row">Day 19</th>
              <td data-value="8">8</td>
            </tr>
            <tr>
              <th scope="row">Day 20</th>
              <td data-value="6">6</td>
            </tr>
            <tr>
              <th scope="row">Day 21</th>
              <td data-value="2">2</td>
            </tr>
            <tr>
              <th scope="row">Day 22</th>
              <td data-value="4">4</td>
            </tr>
            <tr>
              <th scope="row">Day 23</th>
              <td data-value="9">9</td>
            </tr>
            <tr>
              <th scope="row">Day 24</th>
              <td data-value="7">7</td>
            </tr>
            <tr>
              <th scope="row">Day 25</th>
              <td data-value="3">3</td>
            </tr>
            <tr>
              <th scope="row">Day 26</th>
              <td data-value="1">1</td>
            </tr>
            <tr>
              <th scope="row">Day 27</th>
              <td data-value="6">6</td>
            </tr>
            <tr>
              <th scope="row">Day 28</th>
              <td data-value="10">10</td>
            </tr>
            <tr>
              <th scope="row">Day 29</th>
              <td data-value="5">5</td>
            </tr>
            <tr>
              <th scope="row">Day 30</th>
              <td data-value="2">2</td>
            </tr>
          </tbody>
        </table>
      </helix-heatmap>
    </helix-flex>
  )
}
